import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeButton } from "@/components/HomeButton";

// Set to true when the course overview video is ready to go live.
const SHOW_VIDEO_SECTION = false;


export const Route = createFileRoute("/program")({
  component: ProgramPage,
  head: () => ({
    meta: [
      { title: "How the SHLM Program Works — 8-Week Trading Mentorship" },
      { name: "description", content: "Inside the SHLM 8-week trading program: a structured curriculum, weekly mentorship, risk architecture, and a private community built around the breakout strategy." },
      { property: "og:title", content: "How the SHLM Program Works — 8-Week Trading Mentorship" },
      { property: "og:description", content: "Inside the SHLM 8-week trading program: structured curriculum, weekly mentorship, risk architecture, and a private community." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shlm-trading-bloom.lovable.app/program" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/program" },
    ],
  }),
});

function ProgramPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
            SHLM
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <nav className="flex items-center gap-8">
              <Link
                to="/program"
                className="text-sm font-medium text-foreground"
                activeProps={{ className: "text-sm font-medium text-foreground" }}
              >
                Program
              </Link>
              <Link
                to="/"
                hash="mentorship"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Mentorship
              </Link>
              <Link
                to="/"
                hash="pricing"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Pricing
              </Link>
              <Link
                to="/"
                hash="faq"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                FAQ
              </Link>
            </nav>
            <HomeButton />
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Log in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create account
            </Link>
          </div>
          <div className="md:hidden">
            <HomeButton />
          </div>
        </div>
      </header>


      <main>
        <section className="bg-background px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
              The SHLM method
            </p>
            <h1 className="mt-4 text-balance font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              How the program works
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              An 8-week system that takes you from understanding the breakout strategy to executing it with discipline, risk control, and mentor feedback.
            </p>
          </div>
        </section>

        {SHOW_VIDEO_SECTION && (
        <section className="bg-surface px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-foreground"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <p className="font-display text-lg font-medium text-card-foreground">Course overview video</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Replace this placeholder with your video embed (Vimeo, YouTube, or hosted file).
                  </p>
                </div>
              </div>
              <div className="px-6 py-5 sm:px-8">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Tip for the founder:</span> Add a 2–3 minute video walking through the curriculum, the mentorship cadence, and the breakout strategy. This is the highest-converting section on the page.
                </p>
              </div>
            </div>
          </div>
        </section>
        )}


        <section className="bg-background px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 max-w-2xl">
              <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
                The curriculum
              </p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                Eight weeks. One clear path.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Each phase is designed to move you from theory to repeatable, real-market execution. You cannot skip a phase — mastery builds sequentially.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  phase: "Phase 1",
                  weeks: "Week 1",
                  title: "Foundations & market structure",
                  description: "Learn how to read price action, identify liquidity, and understand the anatomy of a trend. The breakout strategy only works if you can see where the market is likely to move.",
                },
                {
                  phase: "Phase 2",
                  weeks: "Week 2",
                  title: "Strategy development",
                  description: "Build your rules-based system: entry criteria, invalidation points, profit targets, and the specific breakout patterns that fit your market and schedule.",
                },
                {
                  phase: "Phase 3",
                  weeks: "Weeks 3–4",
                  title: "Risk & position sizing",
                  description: "Define risk per trade, correlation limits, max daily loss, and portfolio heat. Survival comes before growth.",
                },
                {
                  phase: "Phase 4",
                  weeks: "Week 5",
                  title: "Execution & journaling",
                  description: "Master order flow, slippage management, and the structured trade review process that turns every trade into a lesson.",
                },
                {
                  phase: "Phase 5",
                  weeks: "Week 6",
                  title: "Psychology & discipline",
                  description: "Develop routines, emotional regulation, and the mental guardrails that protect your edge during losing streaks.",
                },
                {
                  phase: "Phase 6",
                  weeks: "Weeks 7–8",
                  title: "Live trading & feedback",
                  description: "Trade live with mentor oversight, receive personalized feedback, and finalize your personal playbook for long-term consistency.",
                },
              ].map((module) => (
                <div key={module.title} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {module.phase}
                    </p>
                    <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                      {module.weeks}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-medium text-card-foreground">{module.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{module.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-surface px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
                  Mentorship
                </p>
                <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  Real feedback, not just content.
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  Information is cheap. Transformation happens through feedback. Your mentor reviews your trades, corrects your blind spots, and keeps you accountable to the process.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "Weekly 1:1 review calls",
                    "Asynchronous trade review between calls",
                    "Custom playbook development for your schedule",
                    "Private mentor channel for urgent questions",
                    "Live market commentary and session prep",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-foreground">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  { title: "Weekly review calls", description: "Deep-dive into your trades, decisions, and emotional patterns." },
                  { title: "Asynchronous feedback", description: "Submit journals and setups for written feedback between calls." },
                  { title: "Custom playbooks", description: "Your mentor helps you refine a strategy that fits your psychology." },
                  { title: "Accountability loop", description: "Regular check-ins keep you aligned with your long-term goals." },
                ].map((card) => (
                  <div key={card.title} className="rounded-3xl border border-border bg-card p-6">
                    <h3 className="font-display text-lg font-medium text-card-foreground">{card.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 max-w-2xl">
              <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
                Community & support
              </p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                You are not trading alone.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Inside the private SHLM community, members share setups, journals, and feedback in real time — daily commentary, trade reviews, and direct access to mentors.
              </p>
            </div>

          </div>
        </section>

        <section className="bg-surface px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Ready to start the program?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose the tier that matches your goals. Every plan includes lifetime access to the curriculum and community.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/"
                hash="pricing"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] hover:bg-primary/90"
              >
                View pricing
              </Link>
              <Link
                to="/"
                className="rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link to="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
              SHLM
            </Link>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SHLM LLC. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
              <Link to="/refund" className="hover:text-foreground">Refund</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
