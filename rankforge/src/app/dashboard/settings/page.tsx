"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  User,
  CreditCard,
  Key,
  Loader2,
  ExternalLink,
  AlertCircle,
  Crown,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

interface SubscriptionInfo {
  planName: string;
  planTier: string;
  articlesUsed: number;
  articlesLimit: number;
  keywordsUsed: number;
  keywordsLimit: number;
  periodEnd: string | null;
}

interface Plan {
  name: string;
  tier: string;
  price: number;
  priceId: string;
  current: boolean;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/user/subscription");
        if (!res.ok) throw new Error("Failed to load subscription info");
        const data = await res.json();
        setSubscription(data.subscription);
        setPlans(data.plans ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load settings"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) throw new Error("Failed to open billing portal");
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to open portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    try {
      setUpgradeLoading(priceId);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) throw new Error("Failed to start checkout");
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setUpgradeLoading(null);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText("rf_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const usagePct =
    subscription && subscription.articlesLimit > 0
      ? Math.round(
          (subscription.articlesUsed / subscription.articlesLimit) * 100
        )
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, subscription, and API access.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Profile section */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? "User"}
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
                {(session?.user?.name ?? "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-foreground">
                {session?.user?.name ?? "User"}
              </p>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email ?? ""}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Name
              </label>
              <input
                type="text"
                value={session?.user?.name ?? ""}
                readOnly
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={session?.user?.email ?? ""}
                readOnly
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-foreground"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Profile information is managed through your Google account.
          </p>
        </div>
      </div>

      {/* Subscription section */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Subscription
          </h2>
        </div>
        <div className="space-y-6 p-6">
          {subscription && (
            <>
              {/* Current plan */}
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-900 dark:bg-primary-950">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary-600" />
                    <span className="text-lg font-bold text-foreground">
                      {subscription.planName} Plan
                    </span>
                  </div>
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Manage Subscription
                  </button>
                </div>
                {subscription.periodEnd && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Current period ends:{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(subscription.periodEnd))}
                  </p>
                )}
              </div>

              {/* Usage this month */}
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Usage This Month
                </h3>
                <div className="mt-3 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Articles Generated
                      </span>
                      <span className="font-medium text-foreground">
                        {subscription.articlesUsed} /{" "}
                        {subscription.articlesLimit === -1
                          ? "Unlimited"
                          : subscription.articlesLimit}
                      </span>
                    </div>
                    {subscription.articlesLimit > 0 && (
                      <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            usagePct >= 90
                              ? "bg-red-500"
                              : usagePct >= 70
                                ? "bg-amber-500"
                                : "bg-primary-500"
                          )}
                          style={{
                            width: `${Math.min(usagePct, 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Keyword Researches
                      </span>
                      <span className="font-medium text-foreground">
                        {subscription.keywordsUsed} /{" "}
                        {subscription.keywordsLimit === -1
                          ? "Unlimited"
                          : subscription.keywordsLimit}
                      </span>
                    </div>
                    {subscription.keywordsLimit > 0 && (
                      <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-secondary-500 transition-all"
                          style={{
                            width: `${Math.min(
                              Math.round(
                                (subscription.keywordsUsed /
                                  subscription.keywordsLimit) *
                                  100
                              ),
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Upgrade options */}
          {plans.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Available Plans
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {plans.map((plan) => (
                  <div
                    key={plan.tier}
                    className={cn(
                      "rounded-lg border p-4",
                      plan.current
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-950"
                        : "border-border bg-background"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {plan.name}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      ${plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    </p>
                    {plan.current ? (
                      <span className="mt-3 inline-block text-xs font-medium text-primary-600">
                        Current Plan
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.priceId)}
                        disabled={upgradeLoading === plan.priceId}
                        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                      >
                        {upgradeLoading === plan.priceId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}
                        Upgrade
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API section */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Key className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">API Access</h2>
        </div>
        <div className="space-y-4 p-6">
          {subscription?.planTier === "scale" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Use your API key to access RankForge programmatically. Keep it
                secret and never share it publicly.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={apiKeyVisible ? "text" : "password"}
                    value="rf_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    readOnly
                    className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 font-mono text-sm text-foreground"
                  />
                </div>
                <button
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  className="rounded-lg border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={apiKeyVisible ? "Hide" : "Show"}
                >
                  {apiKeyVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={copyApiKey}
                  className="rounded-lg border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Copy"
                >
                  {apiKeyCopied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  API Usage This Month
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  0 requests
                </p>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <Key className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                API Access Requires Scale Plan
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Upgrade to the Scale plan to access the RankForge API and
                integrate with your existing workflows.
              </p>
              {plans.find((p) => p.tier === "scale") && (
                <button
                  onClick={() =>
                    handleUpgrade(
                      plans.find((p) => p.tier === "scale")!.priceId
                    )
                  }
                  disabled={upgradeLoading !== null}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  {upgradeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Upgrade to Scale
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
