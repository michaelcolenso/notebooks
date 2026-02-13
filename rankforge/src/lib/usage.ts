import { UsageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserPlan, PLANS } from "@/lib/stripe";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsageLimits {
  articlesPerMonth: number;
  seoAnalysesPerMonth: number;
  keywordResearchPerMonth: number;
}

export interface UsageBreakdown {
  articles: number;
  seoAnalyses: number;
  keywordResearch: number;
  contentOptimizations: number;
}

export interface UsageInfo {
  usage: UsageBreakdown;
  limits: UsageLimits;
  plan: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Return the current month's usage counts for a given user.
 */
export async function getMonthlyUsage(userId: string): Promise<UsageBreakdown> {
  const since = startOfMonth();

  const records = await prisma.usageRecord.groupBy({
    by: ["type"],
    where: {
      userId,
      createdAt: { gte: since },
    },
    _count: { id: true },
  });

  const countByType = (type: UsageType) =>
    records.find((r) => r.type === type)?._count?.id ?? 0;

  return {
    articles: countByType(UsageType.ARTICLE_GENERATED),
    seoAnalyses: countByType(UsageType.SEO_ANALYSIS),
    keywordResearch: countByType(UsageType.KEYWORD_RESEARCH),
    contentOptimizations: countByType(UsageType.CONTENT_OPTIMIZATION),
  };
}

/**
 * Return the plan limits for a user.
 */
export async function getUserLimits(userId: string): Promise<UsageLimits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripePriceId: true },
  });

  const planKey = getUserPlan(user?.stripePriceId);
  const plan = PLANS[planKey];

  return {
    articlesPerMonth: plan.articlesPerMonth,
    seoAnalysesPerMonth: plan.seoAnalysesPerMonth,
    keywordResearchPerMonth: plan.keywordResearchPerMonth,
  };
}

/**
 * Check if the user can perform a given usage type. Returns true if under
 * limit, false otherwise. A limit of -1 means unlimited.
 */
export async function canUse(
  userId: string,
  type: UsageType
): Promise<boolean> {
  const [usage, limits] = await Promise.all([
    getMonthlyUsage(userId),
    getUserLimits(userId),
  ]);

  switch (type) {
    case UsageType.ARTICLE_GENERATED:
      return (
        limits.articlesPerMonth === -1 ||
        usage.articles < limits.articlesPerMonth
      );
    case UsageType.SEO_ANALYSIS:
    case UsageType.CONTENT_OPTIMIZATION:
      return (
        limits.seoAnalysesPerMonth === -1 ||
        usage.seoAnalyses + usage.contentOptimizations <
          limits.seoAnalysesPerMonth
      );
    case UsageType.KEYWORD_RESEARCH:
      return (
        limits.keywordResearchPerMonth === -1 ||
        usage.keywordResearch < limits.keywordResearchPerMonth
      );
    default:
      return false;
  }
}

/**
 * Record a usage event.
 */
export async function trackUsage(
  userId: string,
  type: UsageType,
  tokens: number = 0
): Promise<void> {
  await prisma.usageRecord.create({
    data: {
      userId,
      type,
      tokens,
    },
  });
}

/**
 * Get full usage info for a user, including current usage, limits and plan name.
 */
export async function getUsageInfo(userId: string): Promise<UsageInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripePriceId: true },
  });

  const planKey = getUserPlan(user?.stripePriceId);
  const plan = PLANS[planKey];

  const usage = await getMonthlyUsage(userId);

  return {
    usage,
    limits: {
      articlesPerMonth: plan.articlesPerMonth,
      seoAnalysesPerMonth: plan.seoAnalysesPerMonth,
      keywordResearchPerMonth: plan.keywordResearchPerMonth,
    },
    plan: plan.name,
  };
}
