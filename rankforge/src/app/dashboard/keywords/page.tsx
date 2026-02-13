"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  DollarSign,
  Lightbulb,
  ArrowUpRight,
} from "lucide-react";

interface KeywordResult {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
}

interface ResearchResult {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  relatedKeywords: KeywordResult[];
  longTailVariations: string[];
  contentSuggestions: string[];
}

function getDifficultyLabel(d: number): string {
  if (d <= 20) return "Very Easy";
  if (d <= 40) return "Easy";
  if (d <= 60) return "Medium";
  if (d <= 80) return "Hard";
  return "Very Hard";
}

function getDifficultyColor(d: number): string {
  if (d <= 30) return "text-emerald-600";
  if (d <= 60) return "text-amber-600";
  return "text-red-600";
}

function getDifficultyBarColor(d: number): string {
  if (d <= 30) return "bg-emerald-500";
  if (d <= 60) return "bg-amber-500";
  return "bg-red-500";
}

export default function KeywordsPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/keywords/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: query.trim() }),
      });
      if (!res.ok) throw new Error("Failed to research keyword");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Keyword Research
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover high-value keywords to target in your content strategy.
        </p>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-border bg-card p-6">
        <label className="text-sm font-medium text-foreground">
          Enter a keyword to research
        </label>
        <div className="mt-2 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="e.g., content marketing strategy"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-lg border border-border bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Research
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          <p className="mt-4 text-sm text-muted-foreground">
            Analyzing keyword data...
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-6">
          {/* Overview cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Est. Volume
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">
                {result.volume.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                monthly searches
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Difficulty Score
                </span>
              </div>
              <p
                className={cn(
                  "mt-3 text-3xl font-bold",
                  getDifficultyColor(result.difficulty)
                )}
              >
                {result.difficulty}/100
              </p>
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      getDifficultyBarColor(result.difficulty)
                    )}
                    style={{ width: `${result.difficulty}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getDifficultyLabel(result.difficulty)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  CPC Estimate
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">
                ${result.cpc.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                cost per click
              </p>
            </div>
          </div>

          {/* Related Keywords Table */}
          {result.relatedKeywords.length > 0 && (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Related Keywords
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Similar keywords you may want to target.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Keyword
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Volume
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Difficulty
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.relatedKeywords.map((kw, i) => (
                      <tr
                        key={i}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-foreground">
                          {kw.term}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-muted-foreground">
                          {kw.volume.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              getDifficultyColor(kw.difficulty ?? 0)
                            )}
                          >
                            {kw.difficulty ?? "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Long-tail Variations */}
          {result.longTailVariations && result.longTailVariations.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">
                Long-Tail Variations
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Lower competition keyword variations to consider.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.longTailVariations.map((variation, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground"
                  >
                    <ArrowUpRight className="h-3 w-3 text-primary-500" />
                    {variation}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content Suggestions */}
          {result.contentSuggestions && result.contentSuggestions.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-foreground">
                  Content Suggestions
                </h2>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Ideas to build your content around this keyword.
              </p>
              <ul className="mt-4 space-y-3">
                {result.contentSuggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground">{suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="py-16 text-center">
          <Search className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Start Your Research
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Enter a keyword above to discover search volume, difficulty, related
            keywords, and content ideas.
          </p>
        </div>
      )}
    </div>
  );
}
