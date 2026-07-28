import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  tier: z.enum(["foundation", "mentorship", "elite"]).optional(),
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

const tierDetails: Record<string, { title: string; description: string; perks: string[] }> = {
  foundation: {
    title: "Foundation",
    description: "Your self-paced learning path is unlocked.",
    perks: ["Breakout strategy core curriculum", "12-week structured program", "Private community access"],
  },
  mentorship: {
    title: "Mentorship",
    description: "Group mentorship + live sessions are now unlocked.",
    perks: ["Everything in Foundation", "Weekly group mentorship calls", "Live trade reviews & Q&A"],
  },
  elite: {
    title: "Elite",
    description: "Full 1-on-1 mentorship + priority access unlocked.",
    perks: ["Everything in Mentorship", "1-on-1 mentor calls", "Direct private channel access", "Priority support"],
  },
};

function SuccessPage() {
  const { tier = "foundation", session_id } = useSearch({ from: "/success" });
  const details = tierDetails[tier] ?? tierDetails.foundation;

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
            You’re in.
          </h1>
          <p className="mt-2 text-muted-foreground">
            {details.description}
          </p>

          <div className="mt-8 rounded-xl border border-border bg-surface p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Confirmed tier
            </p>
            <p className="mt-1 font-display text-2xl font-medium">
              {details.title}
            </p>
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
            <Link
              to="/"
              className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Back to SHLM
            </Link>
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
