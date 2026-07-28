import { createFileRoute } from "@tanstack/react-router";
import { FeatureLayout } from "./features.curriculum";

export const Route = createFileRoute("/features/mentorship")({
  head: () => ({
    meta: [
      { title: "Live Mentorship — SHLM Trading Mentorship" },
      { name: "description", content: "Weekly 1:1 calls with experienced traders who review your trades, correct mistakes, and sharpen your edge." },
      { property: "og:title", content: "Live Mentorship — SHLM" },
      { property: "og:description", content: "Weekly 1:1 mentor calls, trade reviews, and direct feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MentorshipPage,
});

function MentorshipPage() {
  const items = [
    { title: "Weekly 1:1 calls", body: "A recurring slot with your mentor. Bring your trades, journal, and questions — leave with a clear plan for the week." },
    { title: "Live trade reviews", body: "Screen-share your setups and executions. Get direct feedback on entries, exits, sizing, and where discipline broke down." },
    { title: "Personalized playbook", body: "Your mentor helps refine a breakout playbook that fits your schedule, timeframe, and risk tolerance — not a copy-paste system." },
    { title: "Async support", body: "Between calls, share charts and questions in the private community and get responses from mentors and senior members." },
  ];

  return (
    <FeatureLayout kicker="Live mentorship" title="Direct access to traders who have done the work." intro="Not a course you binge alone. You get scheduled 1:1 time with a mentor, real feedback on real trades, and a playbook built around how you actually trade.">
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
