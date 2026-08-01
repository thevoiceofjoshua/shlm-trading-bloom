import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { HomeButton } from "@/components/HomeButton";
import { verifyCheckoutSession } from "@/lib/checkout.functions";
import { EXTENSION, PROGRAM, formatUsd } from "@/lib/tiers";


const searchSchema = z.object({
  kind: z.enum(["program", "extension"]).optional(),
  /** Legacy links from the old three-tier model. */
  tier: z.string().optional(),
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/success")({
  validateSearch: (s) => searchSchema.parse(s),
  component: SuccessPage,
  head: () => ({
    meta: [
      { title: "Welcome to SHLM — Purchase Confirmed" },
      { name: "description", content: "Your SHLM mentorship plan is confirmed. Head to your private dashboard to begin." },
      { property: "og:title", content: "Welcome to SHLM — Purchase Confirmed" },
      { property: "og:description", content: "Your SHLM mentorship plan is confirmed. Head to your private dashboard to begin." },
      { property: "og:url", content: "https://shlm-trading-bloom.lovable.app/success" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/success" }],
  }),
});

const purchaseDetails: Record<string, { title: string; description: string; perks: string[] }> = {
  program: {
    title: `${PROGRAM.name} — ${PROGRAM.weeks} weeks`,
    description: `Your ${PROGRAM.weeks}-week mentorship access is unlocked.`,
    perks: [
      "Breakout strategy curriculum",
      `${PROGRAM.weeks} weeks of live mentorship and trade reviews`,
      "Private community access",
      `Extend any time for ${formatUsd(EXTENSION.amount)}/month`,
    ],
  },
  extension: {
    title: EXTENSION.name,
    description: "Your mentorship access has been extended.",
    perks: [
      "Continued live mentorship and trade reviews",
      "Continued private community access",
      "New access end date shown on your dashboard",
    ],
  },
};

function SuccessPage() {
  const { kind: urlKind, tier: legacyTier, session_id } = useSearch({ from: "/success" });
  const verify = useServerFn(verifyCheckoutSession);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["verify-checkout", session_id],
    queryFn: () => verify({ data: { session_id: session_id! } }),
    enabled: !!session_id,
    retry: false,
  });

  const verifiedKind = data?.paid ? data.kind : undefined;
  const kind = verifiedKind ?? urlKind ?? (legacyTier ? "program" : "program");
  const details = purchaseDetails[kind] ?? purchaseDetails.program;
  const showUnverified = session_id && !isLoading && (isError || !data?.paid);


  return (
    <div className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl text-center">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight">
          SHLM
        </Link>

        <div className="mt-10 rounded-2xl border border-border bg-card p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon />
          </div>

          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
            {isLoading && session_id ? "Confirming payment…" : showUnverified ? "Payment not verified" : "You’re in."}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {showUnverified
              ? "We couldn't verify this checkout session. If you were charged, contact support with your receipt."
              : details.description}
          </p>

          <div className="mt-8 rounded-xl border border-border bg-surface p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {showUnverified ? "Requested purchase" : "Confirmed purchase"}
            </p>
            <p className="mt-1 font-display text-2xl font-medium">
              {details.title}
            </p>
            {kind === "extension" && data?.months ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {data.months} additional month{data.months === 1 ? "" : "s"}
              </p>
            ) : null}
            {data?.paid && data.email && (
              <p className="mt-2 text-xs text-muted-foreground">Receipt sent to {data.email}</p>
            )}
            {session_id && (
              <p className="mt-2 text-xs text-muted-foreground">
                Session: {session_id.slice(0, 12)}…
              </p>
            )}
          </div>


          <ul className="mt-8 space-y-3 text-left">
            {details.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3">
            <Link
              to="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to your dashboard
            </Link>
            <HomeButton />
          </div>

        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Didn’t see your confirmation?{" "}
          <a href="mailto:support@shlm.com" className="font-medium text-foreground underline-offset-4 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
