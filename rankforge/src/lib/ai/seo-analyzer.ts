// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CheckImpact = "high" | "medium" | "low";

export interface SEOCheck {
  name: string;
  passed: boolean;
  message: string;
  impact: CheckImpact;
}

export interface SEOAnalysis {
  overallScore: number;
  checks: SEOCheck[];
}

export interface ReadabilityResult {
  score: number;
  grade: string;
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Count the number of syllables in an English word using a simple heuristic.
 *
 * This is an approximation — accurate syllable counting requires a
 * pronunciation dictionary, but this is sufficient for Flesch-Kincaid.
 */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return 1;

  // Patterns that indicate vowel groups
  const vowelGroups = w.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;

  // Silent 'e' at end
  if (w.endsWith("e") && !w.endsWith("le") && count > 1) {
    count--;
  }

  // Words ending in 'ed' where the 'ed' is silent (e.g. "played")
  if (w.endsWith("ed") && w.length > 3 && count > 1) {
    const beforeEd = w.charAt(w.length - 3);
    if (beforeEd !== "t" && beforeEd !== "d") {
      count--;
    }
  }

  return Math.max(1, count);
}

/**
 * Extract plain text from markdown, stripping syntax, code blocks, and links.
 */
function stripMarkdown(markdown: string): string {
  return (
    markdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`[^`]*`/g, "")
      // Remove images
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      // Convert links to just their text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic markers
      .replace(/[*_]{1,3}/g, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Remove blockquote markers
      .replace(/^>\s*/gm, "")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Collapse whitespace
      .replace(/\n{2,}/g, "\n")
      .trim()
  );
}

function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Split text into sentences using a simple heuristic.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Calculate keyword density as a percentage.
 */
function calculateKeywordDensity(text: string, keyword: string): number {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const words = countWords(lowerText);
  if (words === 0) return 0;

  // Count occurrences of the full keyword phrase
  let occurrences = 0;
  let pos = 0;
  while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
    occurrences++;
    pos += lowerKeyword.length;
  }

  const keywordWordCount = lowerKeyword.split(/\s+/).length;
  return (occurrences * keywordWordCount * 100) / words;
}

/**
 * Extract heading texts at a given level from markdown.
 */
function extractHeadings(markdown: string, level: number): string[] {
  const pattern = new RegExp(`^${"#".repeat(level)}\\s+(.+)$`, "gm");
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

/**
 * Flesch-Kincaid readability calculations.
 */
function calculateReadability(text: string): ReadabilityResult {
  const plainText = stripMarkdown(text);
  const sentences = splitSentences(plainText);
  const words = plainText.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0 || sentences.length === 0) {
    return {
      score: 0,
      grade: "N/A",
      averageSentenceLength: 0,
      averageSyllablesPerWord: 0,
    };
  }

  const totalSyllables = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0
  );
  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;

  // Flesch Reading Ease formula
  const score =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

  // Map score to an approximate grade level label
  let grade: string;
  if (clampedScore >= 90) grade = "5th grade (very easy)";
  else if (clampedScore >= 80) grade = "6th grade (easy)";
  else if (clampedScore >= 70) grade = "7th grade (fairly easy)";
  else if (clampedScore >= 60) grade = "8th-9th grade (standard)";
  else if (clampedScore >= 50) grade = "10th-12th grade (fairly difficult)";
  else if (clampedScore >= 30) grade = "College level (difficult)";
  else grade = "Graduate level (very difficult)";

  return {
    score: clampedScore,
    grade,
    averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    averageSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// SEO Checks
// ---------------------------------------------------------------------------

function checkKeywordInTitle(title: string, keyword: string): SEOCheck {
  const passed = title.toLowerCase().includes(keyword.toLowerCase());
  return {
    name: "Keyword in title",
    passed,
    message: passed
      ? `Title contains the target keyword "${keyword}".`
      : `Title does not contain the target keyword "${keyword}". Include it for better rankings.`,
    impact: "high",
  };
}

function checkKeywordInFirstParagraph(
  content: string,
  keyword: string
): SEOCheck {
  const plainText = stripMarkdown(content);
  // Consider the first 100 words as the "first paragraph" zone
  const firstChunk = plainText.split(/\s+/).slice(0, 100).join(" ");
  const passed = firstChunk.toLowerCase().includes(keyword.toLowerCase());

  return {
    name: "Keyword in first paragraph",
    passed,
    message: passed
      ? "Target keyword appears within the first 100 words."
      : "Target keyword is missing from the first 100 words. Add it early to signal relevance.",
    impact: "high",
  };
}

function checkKeywordDensity(content: string, keyword: string): SEOCheck {
  const plainText = stripMarkdown(content);
  const density = calculateKeywordDensity(plainText, keyword);
  const passed = density >= 1 && density <= 3;

  return {
    name: "Keyword density",
    passed,
    message: passed
      ? `Keyword density is ${density.toFixed(1)}% (ideal range: 1-3%).`
      : density < 1
        ? `Keyword density is only ${density.toFixed(1)}%. Aim for 1-3% by adding more natural keyword mentions.`
        : `Keyword density is ${density.toFixed(1)}%, which may appear as keyword stuffing. Reduce to 1-3%.`,
    impact: "high",
  };
}

function checkMetaDescription(metaDescription: string): SEOCheck {
  const length = metaDescription.length;
  const passed = length >= 150 && length <= 160;

  return {
    name: "Meta description length",
    passed,
    message: passed
      ? `Meta description is ${length} characters (ideal: 150-160).`
      : length === 0
        ? "No meta description provided. Add a compelling 150-160 character description."
        : length < 150
          ? `Meta description is ${length} characters — too short. Aim for 150-160 characters.`
          : `Meta description is ${length} characters — too long. Trim to 150-160 characters to avoid truncation in SERPs.`,
    impact: "medium",
  };
}

function checkHeadingStructure(content: string): SEOCheck {
  const h2s = extractHeadings(content, 2);
  const h3s = extractHeadings(content, 3);

  const hasH2 = h2s.length >= 2;
  const hasH3 = h3s.length >= 1;
  const passed = hasH2 && hasH3;

  const parts: string[] = [];
  if (!hasH2) parts.push("Add at least 2 H2 headings to organize content");
  if (!hasH3) parts.push("Add H3 sub-headings for deeper structure");

  return {
    name: "Heading structure",
    passed,
    message: passed
      ? `Good heading structure: ${h2s.length} H2 and ${h3s.length} H3 headings found.`
      : `Incomplete heading structure. ${parts.join(". ")}.`,
    impact: "medium",
  };
}

function checkContentLength(content: string): SEOCheck {
  const plainText = stripMarkdown(content);
  const words = countWords(plainText);
  const passed = words >= 1000;

  return {
    name: "Content length",
    passed,
    message: passed
      ? `Content is ${words} words. Long-form content (1000+ words) tends to rank better.`
      : `Content is only ${words} words. Aim for at least 1,000 words to improve ranking potential.`,
    impact: "high",
  };
}

function checkInternalLinkingOpportunities(content: string): SEOCheck {
  // Look for [Link: ...] placeholders or actual markdown links
  const placeholderLinks = content.match(/\[Link:\s*[^\]]+\]/g) ?? [];
  const markdownLinks = content.match(/\[[^\]]+\]\([^)]+\)/g) ?? [];
  const totalLinks = placeholderLinks.length + markdownLinks.length;
  const passed = totalLinks >= 2;

  return {
    name: "Internal linking opportunities",
    passed,
    message: passed
      ? `Found ${totalLinks} internal link(s) or link suggestions. Good for site authority.`
      : "Fewer than 2 internal links detected. Add links to related content to improve site structure and SEO.",
    impact: "medium",
  };
}

function checkReadability(content: string): SEOCheck {
  const readability = calculateReadability(content);
  // Score >= 60 is generally considered suitable for a broad audience
  const passed = readability.score >= 60;

  return {
    name: "Readability score",
    passed,
    message: passed
      ? `Flesch Reading Ease: ${readability.score}/100 (${readability.grade}). Good readability for a broad audience.`
      : `Flesch Reading Ease: ${readability.score}/100 (${readability.grade}). Simplify sentences and use shorter words to improve readability.`,
    impact: "medium",
  };
}

function checkImageAltText(content: string): SEOCheck {
  // Check for images in the markdown
  const images = content.match(/!\[([^\]]*)\]\([^)]+\)/g) ?? [];
  const imagesWithoutAlt = images.filter((img) => {
    const altMatch = img.match(/!\[([^\]]*)\]/);
    return !altMatch || altMatch[1].trim().length === 0;
  });

  if (images.length === 0) {
    return {
      name: "Image alt text",
      passed: false,
      message:
        "No images found. Consider adding relevant images with descriptive alt text to improve engagement and image search visibility.",
      impact: "low",
    };
  }

  const passed = imagesWithoutAlt.length === 0;
  return {
    name: "Image alt text",
    passed,
    message: passed
      ? `All ${images.length} image(s) have alt text. Good for accessibility and image SEO.`
      : `${imagesWithoutAlt.length} of ${images.length} image(s) are missing alt text. Add descriptive alt text with the target keyword where relevant.`,
    impact: "low",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a comprehensive SEO analysis on article content.
 *
 * @param content  The article body in Markdown format.
 * @param keyword  The primary target keyword.
 * @param options  Optional overrides. `title` defaults to the first H1/H2 found
 *                 in the content; `metaDescription` defaults to an empty string.
 */
export function analyzeSEO(
  content: string,
  keyword: string,
  options?: { title?: string; metaDescription?: string }
): SEOAnalysis {
  // Attempt to extract a title from the content if not provided
  const titleFromContent =
    options?.title ??
    extractHeadings(content, 1)[0] ??
    extractHeadings(content, 2)[0] ??
    "";
  const metaDescription = options?.metaDescription ?? "";

  const checks: SEOCheck[] = [
    checkKeywordInTitle(titleFromContent, keyword),
    checkKeywordInFirstParagraph(content, keyword),
    checkKeywordDensity(content, keyword),
    checkMetaDescription(metaDescription),
    checkHeadingStructure(content),
    checkContentLength(content),
    checkInternalLinkingOpportunities(content),
    checkReadability(content),
    checkImageAltText(content),
  ];

  // Calculate weighted overall score
  const impactWeights: Record<CheckImpact, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const check of checks) {
    const weight = impactWeights[check.impact];
    totalWeight += weight;
    if (check.passed) {
      earnedWeight += weight;
    }
  }

  const overallScore =
    totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return { overallScore, checks };
}

/**
 * Generate a meta description optimized for the given content and keyword.
 *
 * This produces a standalone description without requiring an AI call — it
 * extracts the most relevant sentence from the content that contains the
 * keyword and trims it to the ideal 150-160 character range.
 *
 * For AI-generated meta descriptions, use `ContentGenerator.generateArticle()`
 * which includes one in its output.
 */
export function generateMetaDescription(
  content: string,
  keyword: string
): string {
  const plainText = stripMarkdown(content);
  const sentences = splitSentences(plainText);
  const lowerKeyword = keyword.toLowerCase();

  // Prefer a sentence that contains the keyword
  const keywordSentence = sentences.find((s) =>
    s.toLowerCase().includes(lowerKeyword)
  );

  const baseSentence = keywordSentence ?? sentences[0] ?? "";

  if (baseSentence.length === 0) {
    return "";
  }

  // Target 150-160 characters
  if (baseSentence.length >= 150 && baseSentence.length <= 160) {
    return baseSentence;
  }

  if (baseSentence.length > 160) {
    // Truncate at a word boundary near 155 characters
    const truncated = baseSentence.slice(0, 157);
    const lastSpace = truncated.lastIndexOf(" ");
    return (
      (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + "..."
    );
  }

  // If too short, try combining with the next sentence
  if (!keywordSentence) {
    return baseSentence.length <= 160
      ? baseSentence
      : baseSentence.slice(0, 157) + "...";
  }

  const sentenceIndex = sentences.indexOf(keywordSentence);
  if (sentenceIndex < sentences.length - 1) {
    const combined = `${keywordSentence}. ${sentences[sentenceIndex + 1]}`;
    if (combined.length >= 150 && combined.length <= 160) {
      return combined;
    }
    if (combined.length > 160) {
      const truncated = combined.slice(0, 157);
      const lastSpace = truncated.lastIndexOf(" ");
      return (
        (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + "..."
      );
    }
    return combined;
  }

  return baseSentence;
}

// Re-export the readability calculator for external use
export { calculateReadability };
