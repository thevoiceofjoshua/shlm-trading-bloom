import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeButton } from "@/components/HomeButton";


export const Route = createFileRoute("/features/curriculum")({
  head: () => ({
    meta: [
      { title: "Structured Curriculum — SHLM Trading Mentorship" },
      { name: "description", content: "An 8-week progression from market structure to advanced breakout execution. No shortcuts — every module builds on the last." },
      { property: "og:title", content: "Structured Curriculum — SHLM" },
      { property: "og:description", content: "A deliberate 8-week path from foundations to live breakout execution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CurriculumPage,
});

function CurriculumPage() {
  const phases = [
    { weeks: "Weeks 01-03", title: "Foundations & market structure", points: ["Reading price action and liquidity", "Identifying trend, range, and transition", "Session-based bias building", "Journaling framework setup"] },
    { weeks: "Weeks 04-06", title: "The breakout strategy", points: ["Consolidation and compression zones", "Breakout triggers and confirmation rules", "Entry mechanics and invalidation", "Backtesting your playbook"] },
    { weeks: "Weeks 07-08", title: "Execution, risk & scaling", points: ["Position sizing and portfolio heat", "Trade management and partial exits", "Psychology and routine design", "Live trading with mentor oversight"] },
  ];

  return (
    <FeatureLayout kicker="Structured curriculum" title="An 8-week path from theory to repeatable execution." intro="No filler modules. Every week is engineered to compound on the last, ending with you trading a defined breakout playbook live.">
      <div className="grid gap-6 md:grid-cols-3">
        {phases.map((p) => (
          <div key={p.title} className="rounded-3xl border border-border bg-card p-7">
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">{p.weeks}</p>
            <h3 className="mt-3 font-display text-xl font-medium text-card-foreground">{p.title}</h3>
            <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-3"><span className="text-foreground">→</span><span>{pt}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </FeatureLayout>
  );
}

export function FeatureLayout({ kicker, title, intro, children }: { kicker: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <p className="mt-10 font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">{kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{intro}</p>
        <div className="mt-16">{children}</div>
        <div className="mt-20 flex flex-wrap gap-4">
          <Link to="/apply" className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-8 text-sm font-medium text-background transition-opacity hover:opacity-90">Apply for mentorship</Link>
          <HomeButton />
        </div>
      </div>
    </main>
  );
}

