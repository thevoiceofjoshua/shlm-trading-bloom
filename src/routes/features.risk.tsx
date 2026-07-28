import { createFileRoute } from "@tanstack/react-router";
import { FeatureLayout } from "./features.curriculum";

export const Route = createFileRoute("/features/risk")({
  head: () => ({
    meta: [
      { title: "Risk Architecture — SHLM Trading Mentorship" },
      { name: "description", content: "Position sizing, drawdown rules, and psychological guardrails built into your daily process." },
      { property: "og:title", content: "Risk Architecture — SHLM" },
      { property: "og:description", content: "The rules and routines that keep capital and confidence intact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RiskPage,
});

function RiskPage() {
  const items = [
    { title: "Position sizing", body: "A defined percent-of-account risk per trade and per idea. No oversized entries, no revenge sizing, no gut-feel adjustments." },
    { title: "Drawdown rules", body: "Daily, weekly, and monthly loss limits that pause you before a bad session turns into a bad month." },
    { title: "Correlation & heat", body: "Track how much of your account is exposed to correlated moves so a single macro event can't take out your book." },
    { title: "Psychological guardrails", body: "Pre-trade checklists, session routines, and journaling prompts that keep discipline mechanical instead of motivational." },
  ];

  return (
    <FeatureLayout kicker="Risk architecture" title="The rules that keep your capital — and your edge — intact." intro="Strategy edges are fragile without a risk system. We install the sizing, limits, and routines that separate professionals from account blow-ups.">
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.title} className="rounded-3xl border border-border bg-card p-7">
            <h3 className="font-display text-xl font-medium text-card-foreground">{it.title}</h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{it.body}</p>
          </div>
        ))}
      </div>
    </FeatureLayout>
  );
}
