import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { PRICING_PLANS, type PlanTier } from "@/lib/stripe";
import { DashboardShell } from "./dashboard-shell";

function getUserPlan(stripePriceId: string | null | undefined): PlanTier {
  if (!stripePriceId) return "starter";
  // Map Stripe price IDs to plan tiers; fallback to starter
  const priceMap: Record<string, PlanTier> = {
    [process.env.STRIPE_STARTER_PRICE_ID ?? ""]: "starter",
    [process.env.STRIPE_GROWTH_PRICE_ID ?? ""]: "growth",
    [process.env.STRIPE_SCALE_PRICE_ID ?? ""]: "scale",
  };
  return priceMap[stripePriceId] ?? "starter";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const planTier = getUserPlan(session.user.stripePriceId);
  const plan = PRICING_PLANS[planTier];

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
      planName={plan.name}
      planTier={planTier}
    >
      {children}
    </DashboardShell>
  );
}
