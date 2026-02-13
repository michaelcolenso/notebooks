"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  FileText,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";

type ArticleStatus = "DRAFT" | "OPTIMIZING" | "PUBLISHED";

interface Article {
  id: string;
  title: string;
  targetKeyword: string | null;
  seoScore: number;
  wordCount: number;
  status: ArticleStatus;
  createdAt: string;
}

const statusFilters: { label: string; value: ArticleStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Optimizing", value: "OPTIMIZING" },
  { label: "Published", value: "PUBLISHED" },
];

function getScoreBadgeColor(score: number): string {
  if (score >= 80)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
  if (score >= 50)
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
  return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
}

function getStatusBadgeColor(status: ArticleStatus): string {
  switch (status) {
    case "PUBLISHED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
    case "OPTIMIZING":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | "ALL">(
    "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/articles?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch articles");
      const data = await res.json();
      setArticles(data.articles ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      setDeleting(id);
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete article");
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Articles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your AI-generated SEO content.
          </p>
        </div>
        <Link
          href="/dashboard/articles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          New Article
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === filter.value
                  ? "bg-primary-600 text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={fetchArticles}
            className="ml-auto text-sm font-medium text-destructive underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && articles.length === 0 && (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No articles found
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your filters or search query."
              : "Create your first AI-powered article to start ranking on search engines."}
          </p>
          {!searchQuery && statusFilter === "ALL" && (
            <Link
              href="/dashboard/articles/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Create Your First Article
            </Link>
          )}
        </div>
      )}

      {/* Articles list */}
      {!loading && !error && articles.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Table header - hidden on mobile */}
          <div className="hidden border-b border-border bg-muted/50 px-6 py-3 sm:grid sm:grid-cols-12 sm:gap-4">
            <span className="col-span-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Keyword
            </span>
            <span className="col-span-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SEO
            </span>
            <span className="col-span-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Words
            </span>
            <span className="col-span-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Date
            </span>
            <span className="col-span-1 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </span>
          </div>

          <div className="divide-y divide-border">
            {articles.map((article) => (
              <div
                key={article.id}
                className="px-6 py-4 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4"
              >
                {/* Title */}
                <div className="col-span-4">
                  <Link
                    href={`/dashboard/articles/${article.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary-600"
                  >
                    {article.title}
                  </Link>
                </div>

                {/* Keyword */}
                <div className="col-span-2 mt-1 sm:mt-0">
                  <span className="text-sm text-muted-foreground">
                    {article.targetKeyword ?? "--"}
                  </span>
                </div>

                {/* SEO Score */}
                <div className="col-span-1 mt-2 flex items-center gap-2 sm:mt-0 sm:justify-center">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      getScoreBadgeColor(article.seoScore)
                    )}
                  >
                    {article.seoScore}
                  </span>
                </div>

                {/* Word count */}
                <div className="col-span-1 hidden text-center text-sm text-muted-foreground sm:block">
                  {article.wordCount.toLocaleString()}
                </div>

                {/* Status */}
                <div className="col-span-1 mt-1 sm:mt-0 sm:text-center">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                      getStatusBadgeColor(article.status)
                    )}
                  >
                    {article.status.toLowerCase()}
                  </span>
                </div>

                {/* Date */}
                <div className="col-span-2 mt-1 text-sm text-muted-foreground sm:mt-0">
                  {formatDate(article.createdAt)}
                </div>

                {/* Actions */}
                <div className="col-span-1 mt-2 flex items-center justify-end gap-1 sm:mt-0">
                  <Link
                    href={`/dashboard/articles/${article.id}`}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(article.id)}
                    disabled={deleting === article.id}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
                    title="Delete"
                  >
                    {deleting === article.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
