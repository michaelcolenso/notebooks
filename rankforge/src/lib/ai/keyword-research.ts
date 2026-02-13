import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ContentGeneratorConfig } from "./content-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeywordAnalysis {
  keyword: string;
  estimatedVolume: number;
  difficulty: number;
  relatedKeywords: string[];
  longTailVariations: string[];
  contentSuggestions: string[];
}

export interface TopicCluster {
  topic: string;
  pillarKeyword: string;
  keywords: string[];
}

export interface KeywordClusterResult {
  clusters: TopicCluster[];
  unclustered: string[];
}

// ---------------------------------------------------------------------------
// Internal: AI client wrapper
// ---------------------------------------------------------------------------

class KeywordAIClient {
  private readonly provider: AIProvider;
  private readonly openai: OpenAI | null;
  private readonly anthropic: Anthropic | null;
  private readonly openaiModel: string;
  private readonly anthropicModel: string;

  constructor(config: ContentGeneratorConfig = {}) {
    this.provider = config.provider ?? "openai";
    this.openaiModel = config.openaiModel ?? "gpt-4o";
    this.anthropicModel = config.anthropicModel ?? "claude-sonnet-4-20250514";

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

  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.provider === "openai" && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.openaiModel,
        temperature: 0.4,
        max_tokens: 2048,
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
        max_tokens: 2048,
        temperature: 0.4,
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse JSON from a response that may be wrapped in code fences.
 */
function extractJSON<T>(raw: string): T {
  // Try fenced code block first
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = fenced ? fenced[1] : raw;

  return JSON.parse(jsonStr) as T;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const KEYWORD_ANALYSIS_SYSTEM_PROMPT = `You are an expert SEO keyword researcher with deep knowledge of search engine behavior, user intent, and competitive analysis. You provide realistic keyword metrics based on your understanding of search trends.

IMPORTANT: In a production system these metrics would come from APIs like Ahrefs, SEMrush, or Google Keyword Planner. You are generating educated estimates based on your training data. Be realistic — do not inflate numbers.

Always output valid JSON matching the exact schema requested. No additional text outside the JSON.`;

function buildKeywordAnalysisPrompt(keyword: string): string {
  return `Analyze the following keyword for SEO content planning: "${keyword}"

Provide a comprehensive analysis in this exact JSON format:
{
  "keyword": "${keyword}",
  "estimatedVolume": <monthly search volume estimate as integer — be realistic based on niche popularity>,
  "difficulty": <keyword difficulty score 0-100 where 0 is easiest to rank for>,
  "relatedKeywords": [<8-12 closely related keywords that share the same search intent>],
  "longTailVariations": [<8-12 longer, more specific keyword phrases derived from the main keyword>],
  "contentSuggestions": [<5-8 specific article title ideas that could rank for this keyword or its variations>]
}

Guidelines for realistic estimates:
- Very niche B2B terms: 100-1,000 monthly volume
- Moderate interest topics: 1,000-10,000 monthly volume
- Popular consumer topics: 10,000-100,000 monthly volume
- Highly competitive head terms: 100,000+ monthly volume
- Difficulty reflects competition: informational long-tail (10-30), moderate competition (30-60), highly competitive (60-90)

Return ONLY the JSON object.`;
}

const CLUSTER_SYSTEM_PROMPT = `You are an expert SEO strategist specializing in topic cluster architecture and content hub planning. Given a list of keywords, group them into logical topic clusters where each cluster could form a content hub with a pillar page and supporting articles.

Always output valid JSON matching the exact schema requested. No additional text outside the JSON.`;

function buildClusterPrompt(keywords: string[]): string {
  return `Group the following keywords into topic clusters:

${keywords.map((k, i) => `${i + 1}. ${k}`).join("\n")}

Return JSON in this exact format:
{
  "clusters": [
    {
      "topic": "<descriptive topic name for the cluster>",
      "pillarKeyword": "<the broadest/highest-volume keyword that should be the pillar page>",
      "keywords": [<all keywords belonging to this cluster, including the pillar keyword>]
    }
  ],
  "unclustered": [<any keywords that do not fit neatly into a cluster>]
}

Rules:
- Each keyword should appear in exactly one cluster OR in the unclustered list
- A cluster must have at least 2 keywords
- Choose pillar keywords that represent the broadest search intent in the group
- Topic names should be concise but descriptive (e.g., "Email Marketing Automation", "React Performance Optimization")
- Only put keywords in unclustered if they truly do not relate to any other keyword in the list

Return ONLY the JSON object.`;
}

// ---------------------------------------------------------------------------
// KeywordResearcher class
// ---------------------------------------------------------------------------

export class KeywordResearcher {
  private readonly client: KeywordAIClient;

  constructor(config?: ContentGeneratorConfig) {
    this.client = new KeywordAIClient(config);
  }

  /**
   * Analyze a single keyword and return estimated metrics, related keywords,
   * long-tail variations, and content suggestions.
   *
   * Note: In production, this would integrate with real SEO APIs (Ahrefs,
   * SEMrush, Google Keyword Planner) for accurate data. The AI-generated
   * estimates here serve as a useful MVP for content planning.
   */
  async analyzeKeyword(keyword: string): Promise<KeywordAnalysis> {
    const raw = await this.client.chat(
      KEYWORD_ANALYSIS_SYSTEM_PROMPT,
      buildKeywordAnalysisPrompt(keyword)
    );

    const parsed = extractJSON<KeywordAnalysis>(raw);

    // Validate and sanitize the response
    return {
      keyword: parsed.keyword ?? keyword,
      estimatedVolume: clampInt(parsed.estimatedVolume, 0, 10_000_000),
      difficulty: clampInt(parsed.difficulty, 0, 100),
      relatedKeywords: ensureStringArray(parsed.relatedKeywords),
      longTailVariations: ensureStringArray(parsed.longTailVariations),
      contentSuggestions: ensureStringArray(parsed.contentSuggestions),
    };
  }

  /**
   * Group a list of keywords into semantically related topic clusters.
   * Each cluster identifies a pillar keyword and the supporting keywords
   * that could form a content hub.
   *
   * Keywords that do not fit any cluster are returned in the `unclustered`
   * array.
   */
  async clusterKeywords(keywords: string[]): Promise<KeywordClusterResult> {
    if (keywords.length === 0) {
      return { clusters: [], unclustered: [] };
    }

    if (keywords.length === 1) {
      return {
        clusters: [
          {
            topic: keywords[0],
            pillarKeyword: keywords[0],
            keywords: [keywords[0]],
          },
        ],
        unclustered: [],
      };
    }

    const raw = await this.client.chat(
      CLUSTER_SYSTEM_PROMPT,
      buildClusterPrompt(keywords)
    );

    const parsed = extractJSON<KeywordClusterResult>(raw);

    // Validate the response structure
    return {
      clusters: Array.isArray(parsed.clusters)
        ? parsed.clusters.map((cluster) => ({
            topic: String(cluster.topic ?? ""),
            pillarKeyword: String(cluster.pillarKeyword ?? ""),
            keywords: ensureStringArray(cluster.keywords),
          }))
        : [],
      unclustered: ensureStringArray(parsed.unclustered),
    };
  }
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function clampInt(value: unknown, min: number, max: number): number {
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (isNaN(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

/**
 * Create a KeywordResearcher with environment-based defaults.
 * Prefers OpenAI when both keys are available.
 */
export function createKeywordResearcher(
  overrides?: ContentGeneratorConfig
): KeywordResearcher {
  const provider: AIProvider =
    overrides?.provider ??
    (process.env.OPENAI_API_KEY
      ? "openai"
      : process.env.ANTHROPIC_API_KEY
        ? "anthropic"
        : "openai");

  return new KeywordResearcher({ provider, ...overrides });
}
