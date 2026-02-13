import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIProvider = "openai" | "anthropic";

export interface GenerateArticleParams {
  keyword: string;
  title: string;
  outline?: string[];
  tone?: string;
  wordCount?: number;
}

export interface GeneratedArticle {
  title: string;
  content: string;
  metaDescription: string;
  seoScore: number;
  wordCount: number;
}

export interface ContentGeneratorConfig {
  provider?: AIProvider;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  /** OpenAI model to use. Defaults to "gpt-4o". */
  openaiModel?: string;
  /** Anthropic model to use. Defaults to "claude-sonnet-4-20250514". */
  anthropicModel?: string;
  /** Controls randomness. 0-2 for OpenAI, 0-1 for Anthropic. Defaults to 0.7. */
  temperature?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_WORD_COUNT = 1500;
const DEFAULT_TONE = "professional yet conversational";

const ARTICLE_SYSTEM_PROMPT = `You are an expert SEO content writer. You produce high-quality, original articles that rank well on search engines and genuinely help readers.

Follow these SEO best practices strictly:
1. **Heading structure**: Use a clear hierarchy with H2 (##) and H3 (###) headings. Never skip levels. Each H2 section should cover a distinct subtopic.
2. **Keyword placement**: Include the target keyword naturally within the first 100 words of the article. Use it in at least one H2 heading.
3. **Keyword density**: Maintain a natural keyword density of 1-3%. Avoid keyword stuffing. Use semantic variations and related terms.
4. **Compelling introduction**: Open with a hook that addresses the reader's pain point or curiosity. State what the article will cover and why it matters.
5. **Actionable conclusions**: End with a clear summary of key takeaways and concrete next steps the reader can take.
6. **Readability**: Use short paragraphs (2-4 sentences). Include bullet points and numbered lists where appropriate. Write at an 8th-grade reading level.
7. **E-E-A-T signals**: Demonstrate experience, expertise, authoritativeness, and trustworthiness throughout the content.
8. **Internal linking opportunities**: Where relevant, suggest placeholder links using [Link: descriptive anchor text] for topics that could link to other articles.

Output the article in Markdown format. Do NOT include the title as an H1 — it will be rendered separately by the application.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildArticleUserPrompt(params: GenerateArticleParams): string {
  const { keyword, title, outline, tone, wordCount } = params;
  const targetWords = wordCount ?? DEFAULT_WORD_COUNT;
  const targetTone = tone ?? DEFAULT_TONE;

  let prompt = `Write a comprehensive, SEO-optimized article.

**Target keyword**: ${keyword}
**Title**: ${title}
**Tone**: ${targetTone}
**Target word count**: approximately ${targetWords} words`;

  if (outline && outline.length > 0) {
    prompt += `\n\n**Required outline (use these as H2 sections)**:\n${outline.map((section, i) => `${i + 1}. ${section}`).join("\n")}`;
  }

  prompt += `\n\nAfter the article, on a new line, output a JSON block fenced with \`\`\`json and \`\`\` containing:
{
  "metaDescription": "A compelling meta description between 150-160 characters that includes the target keyword.",
  "seoScore": <an integer 0-100 self-assessment of how well the article follows SEO best practices>
}`;

  return prompt;
}

function buildOutlineSystemPrompt(): string {
  return `You are an expert SEO content strategist. Given a target keyword and optionally competitor titles, generate a detailed article outline that would outperform existing content. Return ONLY a JSON array of section heading strings — no additional text.`;
}

function buildOutlineUserPrompt(
  keyword: string,
  competitorTitles?: string[]
): string {
  let prompt = `Generate an SEO-optimized article outline for the keyword: "${keyword}"

Requirements:
- 5-8 main sections (H2 level)
- Each heading should be descriptive and naturally incorporate the keyword or closely related terms
- Structure should cover the topic comprehensively: definition, benefits, how-to, comparisons, FAQs
- Aim to create a content structure that would satisfy search intent fully`;

  if (competitorTitles && competitorTitles.length > 0) {
    prompt += `\n\nCompetitor article titles to outperform:\n${competitorTitles.map((t) => `- ${t}`).join("\n")}`;
  }

  prompt += `\n\nReturn ONLY a JSON array of strings. Example: ["Section One", "Section Two"]`;

  return prompt;
}

function buildImproveSystemPrompt(): string {
  return `You are an expert SEO editor. You improve existing content based on specific feedback while preserving the author's voice and existing SEO optimizations. Return ONLY the improved content in Markdown format — no preamble or explanation.`;
}

function buildImproveUserPrompt(
  content: string,
  keyword: string,
  feedback: string
): string {
  return `Improve the following article based on the feedback provided.

**Target keyword**: ${keyword}

**Feedback**:
${feedback}

**Current article**:
${content}`;
}

function countWords(text: string): number {
  return text
    .replace(/```[\s\S]*?```/g, "") // strip code blocks
    .replace(/[#*_\[\]()>`~|\\-]/g, " ") // strip markdown syntax
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function parseArticleResponse(raw: string): {
  content: string;
  metaDescription: string;
  seoScore: number;
} {
  // Try to extract the trailing JSON metadata block
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);

  let metaDescription = "";
  let seoScore = 75; // sensible default
  let content = raw;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      metaDescription = parsed.metaDescription ?? "";
      seoScore =
        typeof parsed.seoScore === "number"
          ? Math.min(100, Math.max(0, parsed.seoScore))
          : 75;
    } catch {
      // If JSON parsing fails, continue with defaults
    }
    // Remove the JSON block from content
    content = raw.slice(0, jsonMatch.index).trimEnd();
  }

  return { content, metaDescription, seoScore };
}

function parseOutlineResponse(raw: string): string[] {
  // Try extracting JSON from a fenced code block first
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = fenced ? fenced[1] : raw;

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // Fall back: split by numbered lines
    return raw
      .split(/\n/)
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter((line) => line.length > 0 && !line.startsWith("```"));
  }

  return [];
}

// ---------------------------------------------------------------------------
// ContentGenerator class
// ---------------------------------------------------------------------------

export class ContentGenerator {
  private readonly provider: AIProvider;
  private readonly openai: OpenAI | null;
  private readonly anthropic: Anthropic | null;
  private readonly openaiModel: string;
  private readonly anthropicModel: string;
  private readonly temperature: number;

  constructor(config: ContentGeneratorConfig = {}) {
    this.provider = config.provider ?? "openai";
    this.temperature = config.temperature ?? 0.7;
    this.openaiModel = config.openaiModel ?? "gpt-4o";
    this.anthropicModel = config.anthropicModel ?? "claude-sonnet-4-20250514";

    // Initialize clients based on provider
    if (this.provider === "openai") {
      const apiKey = config.openaiApiKey ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "OpenAI API key is required. Set OPENAI_API_KEY or pass openaiApiKey in config."
        );
      }
      this.openai = new OpenAI({ apiKey });
      this.anthropic = null;
    } else {
      const apiKey = config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Anthropic API key is required. Set ANTHROPIC_API_KEY or pass anthropicApiKey in config."
        );
      }
      this.anthropic = new Anthropic({ apiKey });
      this.openai = null;
    }
  }

  // -------------------------------------------------------------------------
  // Private: unified chat completion
  // -------------------------------------------------------------------------

  private async chat(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 4096
  ): Promise<string> {
    if (this.provider === "openai" && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.openaiModel,
        temperature: this.temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      return response.choices[0]?.message?.content?.trim() ?? "";
    }

    if (this.provider === "anthropic" && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: this.anthropicModel,
        max_tokens: maxTokens,
        temperature: Math.min(this.temperature, 1), // Anthropic caps at 1
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock && textBlock.type === "text"
        ? textBlock.text.trim()
        : "";
    }

    throw new Error(`No client initialized for provider "${this.provider}".`);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Generate a complete SEO-optimized article.
   *
   * Returns the article content in Markdown, a meta description, an SEO
   * self-assessment score, and the actual word count.
   */
  async generateArticle(
    params: GenerateArticleParams
  ): Promise<GeneratedArticle> {
    const targetWords = params.wordCount ?? DEFAULT_WORD_COUNT;
    // Rough token estimate: ~1.3 tokens per word + headroom for metadata
    const maxTokens = Math.max(4096, Math.ceil(targetWords * 1.5));

    const raw = await this.chat(
      ARTICLE_SYSTEM_PROMPT,
      buildArticleUserPrompt(params),
      maxTokens
    );

    const { content, metaDescription, seoScore } = parseArticleResponse(raw);
    const wordCount = countWords(content);

    return {
      title: params.title,
      content,
      metaDescription,
      seoScore,
      wordCount,
    };
  }

  /**
   * Generate an article outline (array of section headings) for a given
   * keyword. Optionally pass competitor titles so the AI can produce a
   * more comprehensive structure.
   */
  async generateOutline(
    keyword: string,
    competitorTitles?: string[]
  ): Promise<string[]> {
    const raw = await this.chat(
      buildOutlineSystemPrompt(),
      buildOutlineUserPrompt(keyword, competitorTitles),
      1024
    );

    const outline = parseOutlineResponse(raw);

    if (outline.length === 0) {
      throw new Error(
        "Failed to generate outline. The AI response could not be parsed into sections."
      );
    }

    return outline;
  }

  /**
   * Improve existing article content based on editorial or SEO feedback.
   * Returns the revised content in Markdown.
   */
  async improveContent(
    content: string,
    keyword: string,
    feedback: string
  ): Promise<string> {
    // Allow enough tokens for the full revised article
    const currentWords = countWords(content);
    const maxTokens = Math.max(4096, Math.ceil(currentWords * 1.8));

    const improved = await this.chat(
      buildImproveSystemPrompt(),
      buildImproveUserPrompt(content, keyword, feedback),
      maxTokens
    );

    return improved;
  }
}

// ---------------------------------------------------------------------------
// Factory helper (convenience for server-side usage)
// ---------------------------------------------------------------------------

/**
 * Create a ContentGenerator with environment-based defaults.
 * Prefers OpenAI when both keys are available.
 */
export function createContentGenerator(
  overrides?: ContentGeneratorConfig
): ContentGenerator {
  const provider: AIProvider =
    overrides?.provider ??
    (process.env.OPENAI_API_KEY
      ? "openai"
      : process.env.ANTHROPIC_API_KEY
        ? "anthropic"
        : "openai");

  return new ContentGenerator({ provider, ...overrides });
}
