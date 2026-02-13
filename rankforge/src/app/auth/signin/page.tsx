"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Loader2 } from "lucide-react";

function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const plan = searchParams.get("plan");

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn("google", { callbackUrl });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-background to-secondary-50 px-4 dark:from-primary-950 dark:via-background dark:to-secondary-950">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          {/* Logo */}
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/25">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              Sign in to RankForge
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              AI-powered SEO content that ranks. Create optimized articles in
              minutes.
            </p>
          </div>

          {/* Plan selection notice */}
          {plan && (
            <div className="mt-6 rounded-lg border border-primary-200 bg-primary-50 p-4 text-center dark:border-primary-800 dark:bg-primary-950">
              <p className="text-sm text-primary-700 dark:text-primary-300">
                You selected the{" "}
                <span className="font-semibold capitalize">{plan}</span> plan.
                Sign in to get started.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <div className="mt-8">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="relative mt-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-2 text-muted-foreground">
                Free trial included
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 space-y-3">
            {[
              "Generate AI-powered SEO articles",
              "Real-time content optimization",
              "Keyword research and tracking",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0 text-secondary-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature}
              </div>
            ))}
          </div>

          {/* Legal */}
          <div className="mt-8 border-t border-border pt-6">
            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <a
                href="/terms"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        {/* Back to home */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <a
            href="/"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            &larr; Back to RankForge
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
