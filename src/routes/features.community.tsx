import { createFileRoute } from "@tanstack/react-router";
import { FeatureLayout } from "./features.curriculum";

export const Route = createFileRoute("/features/community")({
  head: () => ({
    meta: [
      { title: "Private Community — SHLM Trading Mentorship" },
      { name: "description", content: "A focused network of traders sharing setups, journals, and feedback in real time." },
      { property: "og:title", content: "Private Community — SHLM" },
      { property: "og:description", content: "The private Discord where SHLM members trade, journal, and grow together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const items = [
    { title: "Live setups channel", body: "Members and mentors post breakout setups as they form — with charts, invalidation levels, and rationale." },
    { title: "Journals & reviews", body: "A dedicated space for daily and weekly journals. Public accountability that compounds discipline over months, not days." },
    { title: "Mentor office hours", body: "Recurring text and voice office hours in Discord where you can drop in with questions between 1:1 calls." },
    { title: "No noise, no hype", body: "Curated membership. No signal-selling, no lambos, no fake gurus — just traders working the same playbook." },
  ];

  return (
    <FeatureLayout kicker="Private community" title="A focused network of traders — not a hype server." intro="Trading alone is the fastest way to stall out. Inside the private Discord you'll see live setups, share journals, and get feedback from mentors and members on the same path.">
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.title} className="rounded-3xl border border-border bg-card p-7">
            <h3 className="font-display text-xl font-medium text-card-foreground">{it.title}</h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{it.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <a href="/#pricing" className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-8 text-sm font-medium text-background transition-opacity hover:opacity-90">See pricing</a>
      </div>
    </FeatureLayout>
  );
}
