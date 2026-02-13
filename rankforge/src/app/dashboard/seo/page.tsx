"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ClipboardPaste,
} from "lucide-react";

interface SeoCheck {
  label: string;
  passed: boolean;
  detail: string;
}

interface AnalysisResult {
  score: number;
  checks: SeoCheck[];
  suggestions: string[];
}

export default function SeoAnalyzerPage() {
  const [content, setContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!content.trim() || !keyword.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/seo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          keyword: keyword.trim(),
        }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setResult({
        score: data.score ?? data.seoScore ?? 0,
        checks: data.checks ?? data.seoChecks ?? [],
        suggestions: data.suggestions ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const passedChecks = result?.checks.filter((c) => c.passed).length ?? 0;
  const totalChecks = result?.checks.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">SEO Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste your content and enter a target keyword to get a detailed SEO
          analysis.
        </p>
      </div>

      {/* Input section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <label className="text-sm font-medium text-foreground">
              Target Keyword
            </label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g., best SEO tools 2025"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Content
              </label>
              <span className="text-xs text-muted-foreground">
                {content.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder="Paste your article content here..."
              className="mt-2 w-full resize-none rounded-lg border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!content.trim() || !keyword.trim() || loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            Analyze Content
          </button>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-6">
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
              <ClipboardPaste className="h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Paste & Analyze
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                Enter your content and target keyword, then click Analyze to get
                your SEO score.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
              <p className="mt-4 text-sm text-muted-foreground">
                Analyzing your content...
              </p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Overall Score */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground">
                  Overall SEO Score
                </h3>
                <div className="mt-6 flex items-center justify-center">
                  <div className="relative flex h-44 w-44 items-center justify-center">
                    <svg
                      className="h-full w-full -rotate-90"
                      viewBox="0 0 160 160"
                    >
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                        className="text-muted"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeDasharray={`${(result.score / 100) * 440} 440`}
                        strokeLinecap="round"
                        className={cn(
                          result.score >= 80
                            ? "text-emerald-500"
                            : result.score >= 50
                              ? "text-amber-500"
                              : "text-red-500"
                        )}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-4xl font-bold text-foreground">
                        {result.score}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        / 100
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {passedChecks} of {totalChecks} checks passed
                </p>
              </div>

              {/* SEO Checks */}
              {result.checks.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-sm font-semibold text-foreground">
                    SEO Checklist
                  </h3>
                  <div className="mt-4 space-y-3">
                    {result.checks.map((check, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3",
                          check.passed
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
                            : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                        )}
                      >
                        {check.passed ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {check.label}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {check.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Suggestions for Improvement
                    </h3>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {result.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                          {i + 1}
                        </span>
                        <p className="text-sm text-foreground">{suggestion}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
