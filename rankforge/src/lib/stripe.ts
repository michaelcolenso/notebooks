import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
  typescript: true,
});

/**
 * Plan definitions mapping Stripe price IDs to plan details.
 */
export const PLANS = {
  free: {
    name: "Free",
    articlesPerMonth: 3,
    seoAnalysesPerMonth: 10,
    keywordResearchPerMonth: 5,
  },
  pro: {
    name: "Pro",
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!,
    articlesPerMonth: 50,
    seoAnalysesPerMonth: 200,
    keywordResearchPerMonth: 100,
  },
  enterprise: {
    name: "Enterprise",
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    articlesPerMonth: -1, // unlimited
    seoAnalysesPerMonth: -1,
    keywordResearchPerMonth: -1,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/**
 * Resolve which plan a user is on based on their stripePriceId.
 */
export function getUserPlan(stripePriceId: string | null | undefined): PlanKey {
  if (!stripePriceId) return "free";
  if (stripePriceId === PLANS.pro.stripePriceId) return "pro";
  if (stripePriceId === PLANS.enterprise.stripePriceId) return "enterprise";
  return "free";
}
