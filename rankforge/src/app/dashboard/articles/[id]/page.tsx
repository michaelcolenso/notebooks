"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Globe,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";

interface SeoCheck {
  label: string;
  passed: boolean;
  detail: string;
}

interface Article {
  id: string;
  title: string;
  content: string | null;
  targetKeyword: string | null;
  seoScore: number;
  wordCount: number;
  status: "DRAFT" | "OPTIMIZING" | "PUBLISHED";
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ArticleEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [seoScore, setSeoScore] = useState(0);
  const [seoChecks, setSeoChecks] = useState<SeoCheck[]>([]);
  const [dirty, setDirty] = useState(false);

  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/articles/${id}`);
      if (!res.ok) throw new Error("Failed to load article");
      const data: Article = await res.json();
      setArticle(data);
      setContent(data.content ?? "");
      setTitle(data.title);
      setSeoScore(data.seoScore);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load article");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  // Run SEO analysis when content changes (debounced)
  useEffect(() => {
    if (!content || !article?.targetKeyword) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/seo/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            keyword: article.targetKeyword,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSeoScore(data.score ?? data.seoScore ?? 0);
          setSeoChecks(data.checks ?? data.seoChecks ?? []);
        }
      } catch {
        // Silent fail for live analysis
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [content, article?.targetKeyword]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setArticle(updated);
      setDirty(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleOptimize = async () => {
    try {
      setOptimizing(true);
      const res = await fetch(`/api/articles/${id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Optimization failed");
      const data = await res.json();
      setContent(data.content ?? content);
      setSeoScore(data.seoScore ?? seoScore);
      setSeoChecks(data.seoChecks ?? []);
      setDirty(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setOptimizing(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      // Save first if dirty
      if (dirty) {
        const saveRes = await fetch(`/api/articles/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        if (!saveRes.ok) throw new Error("Failed to save before publishing");
      }
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      const updated = await res.json();
      setArticle(updated);
      setDirty(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this article? This cannot be undone."))
      return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/dashboard/articles");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {error ?? "Article not found"}
        </h3>
        <button
          onClick={() => router.push("/dashboard/articles")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Articles
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/articles")}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              className="w-full border-none bg-transparent text-xl font-bold text-foreground focus:outline-none"
            />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {article.targetKeyword && (
                <span>Keyword: {article.targetKeyword}</span>
              )}
              <span className="capitalize">
                {article.status.toLowerCase()}
              </span>
              {dirty && (
                <span className="text-amber-500">Unsaved changes</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {optimizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Optimize
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || article.status === "PUBLISHED"}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            Publish
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Content + SEO sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card">
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              rows={30}
              placeholder="Start writing your article in markdown..."
              className="w-full resize-none rounded-t-xl border-none bg-background p-6 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
            <div className="flex items-center justify-between rounded-b-xl border-t border-border bg-card px-6 py-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {wordCount.toLocaleString()} words
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {readingTime} min read
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Markdown</span>
            </div>
          </div>
        </div>

        {/* SEO Score Panel */}
        <div className="space-y-6">
          {/* Score gauge */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground">
              SEO Score
            </h3>
            <div className="mt-4 flex items-center justify-center">
              <div className="relative flex h-36 w-36 items-center justify-center">
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
                <div className="absolute text-center">
                  <span className="text-3xl font-bold text-foreground">
                    {seoScore}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    / 100
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SEO Checks */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground">
              SEO Checklist
            </h3>
            {seoChecks.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Start typing to see live SEO analysis.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {seoChecks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    {check.passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                    )}
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          check.passed
                            ? "text-foreground"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {check.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {check.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Article Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground">
              Article Info
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize text-foreground">
                  {article.status.toLowerCase()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-foreground">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(article.createdAt))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last updated</dt>
                <dd className="text-foreground">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(article.updatedAt))}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
