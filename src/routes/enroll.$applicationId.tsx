import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HomeButton } from "@/components/HomeButton";
import { useAuthUser } from "@/hooks/use-auth-user";
import { PROGRAM, formatUsd } from "@/lib/tiers";

export const Route = createFileRoute("/enroll/$applicationId")({
  component: EnrollGate,
  head: () => ({
    meta: [
      { title: "Create Your Account — SHLM Enrollment" },
      {
        name: "description",
        content:
          "Create your SHLM member account to continue to secure checkout and unlock your private mentorship dashboard.",
      },
      { property: "og:title", content: "Create Your Account — SHLM Enrollment" },
      {
        property: "og:description",
        content:
          "Create your SHLM member account to continue to secure checkout and unlock your private mentorship dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function EnrollGate() {
  const { applicationId } = useParams({ from: "/enroll/$applicationId" });
  const { user, loaded } = useAuthUser();
  const [redirecting, setRedirecting] = useState(false);

  const checkoutHref = `/api/public/enroll/${applicationId}`;
  const returnTo = `/enroll/${applicationId}`;

  // Once an account exists, hand off straight to secure checkout.
  useEffect(() => {
    if (!loaded || !user) return;
    setRedirecting(true);
    const t = window.setTimeout(() => {
      window.location.href = checkoutHref;
    }, 900);
    return () => window.clearTimeout(t);
  }, [loaded, user, checkoutHref]);

  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8">
      <HomeButton />

      <div className="mx-auto mt-10 max-w-lg">
        <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
          Step 1 of 2
        </p>
        <h1 className="mt-4 font-display text-3xl leading-[1.05] tracking-tight sm:text-4xl">
          {user ? "Account ready" : "Create your member account"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {user
            ? "Taking you to secure checkout…"
            : "Your account holds your enrollment, progress, and private dashboard. Create it now — checkout is the next step."}
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{PROGRAM.name}</span>
            <span className="font-display text-2xl">{formatUsd(PROGRAM.amount)}</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            One-time enrollment · 8 weeks of mentorship · extensions available from your
            dashboard.
          </p>
        </div>

        {!loaded ? (
          <div className="mt-8 h-12 animate-pulse rounded-full bg-muted" />
        ) : user ? (
          <div className="mt-8 space-y-3">
            <a
              href={checkoutHref}
              className="flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              {redirecting ? "Continuing to checkout…" : "Continue to secure checkout"}
            </a>
            <p className="text-center text-xs text-muted-foreground">
              Signed in as {user.email ?? user.firstName}
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            <Link
              to="/auth"
              search={{ mode: "signup", redirect: returnTo }}
              className="flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Create account &amp; continue
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin", redirect: returnTo }}
              className="flex h-12 w-full items-center justify-center rounded-full border border-border px-6 text-sm font-medium transition hover:bg-muted"
            >
              I already have an account
            </Link>
          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Payments are processed securely by Stripe. Questions? Email{" "}
          <a className="underline" href="mailto:support@shlmtrdng.com">
            support@shlmtrdng.com
          </a>
        </p>
      </div>
    </main>
  );
}
