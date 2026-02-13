"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search,
  Sparkles,
  FileText,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface KeywordData {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  relatedKeywords: { term: string; volume: number }[];
}

interface TitleSuggestion {
  title: string;
  selected: boolean;
}

interface SeoCheck {
  label: string;
  passed: boolean;
  detail: string;
}

const STEPS = [
  { label: "Keyword Research", icon: Search },
  { label: "Configure", icon: Sparkles },
  { label: "Generate", icon: FileText },
  { label: "Review & Save", icon: Check },
];

const TONES = ["Professional", "Casual", "Academic", "Conversational", "Persuasive"];
const WORD_COUNTS = [
  { label: "Short (800 words)", value: 800 },
  { label: "Medium (1500 words)", value: 1500 },
  { label: "Long (2500 words)", value: 2500 },
  { label: "Comprehensive (4000 words)", value: 4000 },
];

export default function NewArticlePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [keyword, setKeyword] = useState("");
  const [researching, setResearching] = useState(false);
  const [keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  // Step 2 state
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [tone, setTone] = useState("Professional");
  const [wordCount, setWordCount] = useState(1500);

  // Step 3 state
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Step 4 state
  const [content, setContent] = useState("");
  const [seoScore, setSeoScore] = useState(0);
  const [seoChecks, setSeoChecks] = useState<SeoCheck[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedTitle =
    titleSuggestions.find((t) => t.selected)?.title || customTitle;

  // Step 1: Research keyword
  const handleResearch = async () => {
    if (!keyword.trim()) return;
    try {
      setResearching(true);
      setResearchError(null);
      const res = await fetch("/api/keywords/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      if (!res.ok) throw new Error("Failed to research keyword");
      const data = await res.json();
      setKeywordData(data);

      // Generate title suggestions
      const titlesRes = await fetch("/api/articles/suggest-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      if (titlesRes.ok) {
        const titlesData = await titlesRes.json();
        setTitleSuggestions(
          (titlesData.titles ?? []).map((t: string, i: number) => ({
            title: t,
            selected: i === 0,
          }))
        );
      }

      setStep(1);
    } catch (err) {
      setResearchError(
        err instanceof Error ? err.message : "Research failed"
      );
    } finally {
      setResearching(false);
    }
  };

  // Step 3: Generate article
  const handleGenerate = async () => {
    if (!selectedTitle) return;
    try {
      setGenerating(true);
      setGenerateError(null);
      setStep(2);

      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          title: selectedTitle,
          tone,
          wordCount,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate article");
      const data = await res.json();
      setGeneratedContent(data.content ?? "");
      setContent(data.content ?? "");
      setSeoScore(data.seoScore ?? 0);
      setSeoChecks(data.seoChecks ?? []);
      setStep(3);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Generation failed"
      );
    } finally {
      setGenerating(false);
    }
  };

  // Step 4: Save article
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedTitle,
          content,
          targetKeyword: keyword.trim(),
          status: "DRAFT",
        }),
      });
      if (!res.ok) throw new Error("Failed to save article");
      const data = await res.json();
      router.push(`/dashboard/articles/${data.id ?? data.article?.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const selectTitle = (index: number) => {
    setTitleSuggestions((prev) =>
      prev.map((t, i) => ({ ...t, selected: i === index }))
    );
    setCustomTitle("");
  };

  const getDifficultyColor = (d: number) => {
    if (d <= 30) return "text-emerald-600";
    if (d <= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getDifficultyBarColor = (d: number) => {
    if (d <= 30) return "bg-emerald-500";
    if (d <= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/dashboard/articles")}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Articles
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          Create New Article
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow the steps below to generate an SEO-optimized article.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  i < step
                    ? "border-primary-600 bg-primary-600 text-white"
                    : i === step
                      ? "border-primary-600 bg-primary-50 text-primary-600 dark:bg-primary-950"
                      : "border-border bg-card text-muted-foreground"
                )}
              >
                {i < step ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 hidden text-xs font-medium sm:block",
                  i <= step ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 sm:w-16 lg:w-24",
                  i < step ? "bg-primary-600" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Keyword Research */}
      {step === 0 && (
        <div className="space-y-6 rounded-xl border border-border bg-card p-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Enter Your Target Keyword
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We will analyze the keyword and provide data to help you create
              the best content.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g., best project management tools"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                className="w-full rounded-lg border border-border bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleResearch}
              disabled={!keyword.trim() || researching}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {researching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Research
            </button>
          </div>

          {researchError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{researchError}</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 1 && keywordData && (
        <div className="space-y-6">
          {/* Keyword data */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">
              Keyword Analysis: &quot;{keywordData.keyword}&quot;
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Search Volume
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {keywordData.volume.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Difficulty
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold",
                    getDifficultyColor(keywordData.difficulty)
                  )}
                >
                  {keywordData.difficulty}/100
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      getDifficultyBarColor(keywordData.difficulty)
                    )}
                    style={{ width: `${keywordData.difficulty}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  CPC Estimate
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  ${keywordData.cpc.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Title selection */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold text-foreground">
              Choose a Title
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Select an AI-suggested title or write your own.
            </p>
            <div className="mt-4 space-y-2">
              {titleSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => selectTitle(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                    suggestion.selected
                      ? "border-primary-500 bg-primary-50 text-foreground dark:bg-primary-950"
                      : "border-border bg-background text-foreground hover:border-primary-300"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
                      suggestion.selected
                        ? "border-primary-600 bg-primary-600"
                        : "border-border"
                    )}
                  >
                    {suggestion.selected && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  {suggestion.title}
                </button>
              ))}
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Or write your own title..."
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    setTitleSuggestions((prev) =>
                      prev.map((t) => ({ ...t, selected: false }))
                    );
                  }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Tone & word count */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold text-foreground">Tone</h3>
              <div className="mt-3 space-y-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      "block w-full rounded-lg border px-4 py-2 text-left text-sm transition-colors",
                      tone === t
                        ? "border-primary-500 bg-primary-50 font-medium text-foreground dark:bg-primary-950"
                        : "border-border text-muted-foreground hover:border-primary-300"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold text-foreground">
                Word Count
              </h3>
              <div className="mt-3 space-y-2">
                {WORD_COUNTS.map((wc) => (
                  <button
                    key={wc.value}
                    onClick={() => setWordCount(wc.value)}
                    className={cn(
                      "block w-full rounded-lg border px-4 py-2 text-left text-sm transition-colors",
                      wordCount === wc.value
                        ? "border-primary-500 bg-primary-50 font-medium text-foreground dark:bg-primary-950"
                        : "border-border text-muted-foreground hover:border-primary-300"
                    )}
                  >
                    {wc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedTitle}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Generate Article
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === 2 && generating && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary-600" />
            <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-primary-600" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-foreground">
            Generating Your Article
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Our AI is crafting SEO-optimized content for &quot;{selectedTitle}&quot;
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500" />
            This usually takes 30-60 seconds
          </div>
        </div>
      )}

      {/* Step 3 error */}
      {step === 2 && !generating && generateError && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Generation Failed
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {generateError}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Save */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Editor */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-6 py-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Target keyword: {keyword}
                  </p>
                </div>
                <div className="p-6">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={24}
                    className="w-full resize-none rounded-lg border border-border bg-background p-4 font-mono text-sm text-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border px-6 py-3">
                  <span className="text-xs text-muted-foreground">
                    {content.split(/\s+/).filter(Boolean).length} words
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ~{Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)}{" "}
                    min read
                  </span>
                </div>
              </div>
            </div>

            {/* SEO sidebar */}
            <div className="space-y-6">
              {/* Score */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground">
                  SEO Score
                </h3>
                <div className="mt-4 flex items-center justify-center">
                  <div className="relative flex h-32 w-32 items-center justify-center">
                    <svg
                      className="h-full w-full -rotate-90"
                      viewBox="0 0 128 128"
                    >
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${(seoScore / 100) * 352} 352`}
                        strokeLinecap="round"
                        className={cn(
                          seoScore >= 80
                            ? "text-emerald-500"
                            : seoScore >= 50
                              ? "text-amber-500"
                              : "text-red-500"
                        )}
                      />
                    </svg>
                    <span className="absolute text-3xl font-bold text-foreground">
                      {seoScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checks */}
              {seoChecks.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-sm font-semibold text-foreground">
                    SEO Checks
                  </h3>
                  <div className="mt-3 space-y-2">
                    {seoChecks.map((check, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {check.passed ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {check.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {check.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save Article
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
