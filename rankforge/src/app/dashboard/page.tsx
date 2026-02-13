import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRICING_PLANS, type PlanTier } from "@/lib/stripe";
import {
  FileText,
  BarChart3,
  Search,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getUserPlan(stripePriceId: string | null | undefined): PlanTier {
  if (!stripePriceId) return "starter";
  const priceMap: Record<string, PlanTier> = {
    [process.env.STRIPE_STARTER_PRICE_ID ?? ""]: "starter",
    [process.env.STRIPE_GROWTH_PRICE_ID ?? ""]: "growth",
    [process.env.STRIPE_SCALE_PRICE_ID ?? ""]: "scale",
  };
  return priceMap[stripePriceId] ?? "starter";
}

function getScoreBadgeColor(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
  if (score >= 50) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
  return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/auth/signin");

  const userId = session.user.id;
  const planTier = getUserPlan(session.user.stripePriceId);
  const plan = PRICING_PLANS[planTier];

  // Parallel data fetching
  const [totalArticles, articles, keywordsCount, monthlyUsageCount, avgScoreResult] =
    await Promise.all([
      prisma.article.count({ where: { userId } }),
      prisma.article.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          seoScore: true,
          status: true,
          createdAt: true,
          targetKeyword: true,
        },
      }),
      prisma.keyword.count({
        where: { project: { userId } },
      }),
      prisma.usageRecord.count({
        where: {
          userId,
          type: "ARTICLE_GENERATED",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.article.aggregate({
        where: { userId },
        _avg: { seoScore: true },
      }),
    ]);

  const avgScore = Math.round(avgScoreResult._avg.seoScore ?? 0);
  const articleLimit = plan.articles === -1 ? "Unlimited" : plan.articles;
  const usagePct =
    plan.articles === -1
      ? 0
      : Math.round((monthlyUsageCount / plan.articles) * 100);

  const stats = [
    {
      label: "Total Articles",
      value: totalArticles,
      icon: FileText,
      color: "text-primary-600",
      bg: "bg-primary-50 dark:bg-primary-950",
    },
    {
      label: "Average SEO Score",
      value: avgScore,
      icon: BarChart3,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Keywords Tracked",
      value: keywordsCount,
      icon: Search,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Monthly Usage",
      value: `${monthlyUsageCount}/${articleLimit}`,
      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
          Welcome back, {session.user.name?.split(" ")[0] ?? "there"}!
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of your content performance.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <div className={cn("rounded-lg p-2.5", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {stat.value}
            </p>
            {stat.label === "Monthly Usage" && plan.articles !== -1 && (
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary-500 transition-all"
                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {usagePct}% used
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/articles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          New Article
        </Link>
        <Link
          href="/dashboard/keywords"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Search className="h-4 w-4" />
          Research Keywords
        </Link>
        <Link
          href="/dashboard/seo"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <BarChart3 className="h-4 w-4" />
          Analyze Content
        </Link>
      </div>

      {/* Recent articles */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Articles
          </h2>
          <Link
            href="/dashboard/articles"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-sm font-medium text-foreground">
              No articles yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by creating your first AI-powered article.
            </p>
            <Link
              href="/dashboard/articles/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Create Article
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/dashboard/articles/${article.id}`}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {article.title}
                  </p>
                  {article.targetKeyword && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Keyword: {article.targetKeyword}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      getScoreBadgeColor(article.seoScore)
                    )}
                  >
                    {article.seoScore}
                  </span>
                  <span className="hidden text-xs capitalize text-muted-foreground sm:block">
                    {article.status.toLowerCase()}
                  </span>
                  <span className="hidden text-xs text-muted-foreground md:block">
                    {formatDate(article.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
