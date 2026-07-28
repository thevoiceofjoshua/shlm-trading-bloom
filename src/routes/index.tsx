import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSiteStats, type SiteStats } from "@/lib/site-stats.functions";
import heroBg from "@/assets/hero-bg.jpg";

const siteStatsQuery = (fn: () => Promise<SiteStats>) =>
  queryOptions({ queryKey: ["site_stats"], queryFn: fn, staleTime: 30_000 });

const HOMEPAGE_FAQS = [
  {
    q: "Do I need trading experience to join?",
    a: "Foundation is beginner-friendly. Mentorship and Elite are best suited for traders who have placed live trades and want to professionalize their process.",
  },
  {
    q: "How long do I have access to the curriculum?",
    a: "Lifetime. You keep access to every module, template, and update released after your enrollment.",
  },
  {
    q: "What markets does the program cover?",
    a: "The principles apply across equities, futures, forex, and crypto. Your mentor helps you adapt the system to your preferred market.",
  },
  {
    q: "Can I upgrade after joining Foundation?",
    a: "Yes. Foundation members can apply to upgrade to Mentorship or Elite at any time and receive credit toward the higher tier.",
  },
];

export const Route = createFileRoute("/")({
  component: Index,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      siteStatsQuery(() => getSiteStats()),
    );
  },
  head: () => ({
    meta: [
      { title: "SHLM — Premium Trading Mentorship for Disciplined Growth" },
      { name: "description", content: "Join SHLM and learn to trade with discipline, structure, and a mentor-backed system built for long-term consistency." },
      { property: "og:title", content: "SHLM — Premium Trading Mentorship for Disciplined Growth" },
      { property: "og:description", content: "Join SHLM and learn to trade with discipline, structure, and a mentor-backed system built for long-term consistency." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shlm-trading-bloom.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: HOMEPAGE_FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
});

function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const getFn = useServerFn(getSiteStats);
  const { data: stats } = useSuspenseQuery(siteStatsQuery(() => getFn()));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main>
        <HeroSection stats={stats} />
        <StatsSection stats={stats} />
        <FeaturesSection />
        <ProgramSection />
        <MentorshipSection />
        <PricingSection />
        <TestimonialsSection />
        <DiscordSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}


function Header({
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}) {
  const navLinks = [
    { label: "Program", href: "/program" },
    { label: "Mentorship", href: "#mentorship" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
          SHLM
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/auth?mode=signin"
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Log in
          </a>
          <a
            href="/auth?mode=signup"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create account
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3">
              <a
                href="/auth?mode=signin"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full border border-border bg-background px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Log in
              </a>
              <a
                href="/auth?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Create account
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function HeroSection({ stats }: { stats: SiteStats }) {
  return (
    <section className="relative overflow-hidden bg-background px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="max-w-2xl">
            <p className="mb-4 font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Premium trading mentorship
            </p>
            <h1 className="text-balance font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              SHLM — Premium Trading Mentorship for Disciplined Growth
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              SHLM is a mentorship program for traders who want a structured system, real feedback, and the discipline to perform consistently in any market.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#pricing"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] hover:bg-primary/90"
              >
                Start your application
              </a>
              <a
                href="/program"
                className="group inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Explore the program
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-foreground" />
              <span>{stats.hero_note}</span>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-square rounded-3xl bg-primary p-8 sm:p-12">
              <div className="absolute inset-0 rounded-3xl opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
              <div className="relative flex h-full flex-col justify-between text-primary-foreground">
                <div>
                  <p className="font-display text-sm uppercase tracking-widest opacity-70">Live performance</p>
                  <p className="mt-2 font-display text-5xl font-medium sm:text-6xl">{stats.performance_value}</p>
                  <p className="mt-1 text-sm opacity-70">
                    {stats.performance_note}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
                    <p className="font-display text-2xl font-medium">12</p>
                    <p className="text-xs opacity-70">Week curriculum</p>
                  </div>
                  <div className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
                    <p className="font-display text-2xl font-medium">1:1</p>
                    <p className="text-xs opacity-70">Weekly mentor calls</p>
                  </div>
                  <div className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
                    <p className="font-display text-2xl font-medium">24/7</p>
                    <p className="text-xs opacity-70">Community access</p>
                  </div>
                  <div className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
                    <p className="font-display text-2xl font-medium">100%</p>
                    <p className="text-xs opacity-70">Strategy backtested</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden h-48 w-48 rounded-2xl border border-border bg-card p-4 shadow-lg lg:block">
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-chart-2" />
                  <span className="text-xs font-medium text-muted-foreground">Risk per trade</span>
                </div>
                <div>
                  <p className="font-display text-3xl font-medium">1.5%</p>
                  <p className="text-xs text-muted-foreground">Max position size</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection({ stats }: { stats: SiteStats }) {
  const items = [
    { value: stats.cohort_value, label: stats.cohort_label },
    { value: "12", label: "Week structured program" },
    { value: "1:1", label: "Mentor relationship" },
    { value: stats.results_value, label: stats.results_label },
  ];

  return (
    <section className="border-y border-border bg-surface px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 sm:grid-cols-4">
        {items.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-3xl font-medium text-foreground sm:text-4xl">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      title: "Structured curriculum",
      description: "A 12-week progression from market structure to advanced execution. No shortcuts. Every module builds on the last.",
      span: "md:col-span-2 md:row-span-2",
    },
    {
      title: "Live mentorship",
      description: "Weekly 1:1 calls with experienced traders who review your trades, correct mistakes, and sharpen your edge.",
      span: "",
    },
    {
      title: "Risk architecture",
      description: "Position sizing, drawdown rules, and psychological guardrails built into your daily process.",
      span: "",
    },
    {
      title: "Private community",
      description: "Access a focused network of traders sharing setups, journals, and feedback in real time.",
      span: "md:col-span-2",
    },
  ];

  return (
    <section className="bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">What you receive</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Everything needed to trade like a professional.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group flex flex-col justify-between rounded-3xl border border-border bg-card p-7 transition-shadow hover:shadow-lg ${feature.span}`}
            >
              <div>
                <h3 className="font-display text-xl font-medium text-card-foreground">{feature.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="transition-transform group-hover:translate-x-1">Learn more</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgramSection() {
  const modules = [
    { week: "01-02", title: "Foundations & market structure", description: "Reading price action, liquidity, and the anatomy of a trend." },
    { week: "03-04", title: "Strategy development", description: "Building a rules-based system with entry, exit, and invalidation criteria." },
    { week: "05-06", title: "Risk & position sizing", description: "Defining risk per trade, correlation limits, and portfolio heat." },
    { week: "07-08", title: "Execution & journaling", description: "Order flow, slippage management, and structured trade review." },
    { week: "09-10", title: "Psychology & discipline", description: "Emotional regulation, routines, and protecting your edge." },
    { week: "11-12", title: "Live trading & feedback", description: "Trade live with mentor oversight and refine your personal playbook." },
  ];

  return (
    <section id="program" className="bg-surface px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">The curriculum</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Twelve weeks. One clear path.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Each phase is designed to move you from theory to repeatable, real-market execution.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <div key={module.title} className="rounded-2xl border border-border bg-card p-6">
              <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">{module.week}</p>
              <h3 className="mt-3 font-display text-lg font-medium text-card-foreground">{module.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{module.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MentorshipSection() {
  return (
    <section id="mentorship" className="bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="font-display text-sm font-semibold">1</span>
                </div>
                <h3 className="font-display text-lg font-medium text-card-foreground">Weekly review calls</h3>
                <p className="mt-2 text-sm text-muted-foreground">Deep-dive into your trades, decisions, and emotional patterns with your mentor.</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="font-display text-sm font-semibold">2</span>
                </div>
                <h3 className="font-display text-lg font-medium text-card-foreground">Asynchronous feedback</h3>
                <p className="mt-2 text-sm text-muted-foreground">Submit journals and setups for written feedback between calls.</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="font-display text-sm font-semibold">3</span>
                </div>
                <h3 className="font-display text-lg font-medium text-card-foreground">Custom playbooks</h3>
                <p className="mt-2 text-sm text-muted-foreground">Your mentor helps you refine a strategy that fits your schedule and psychology.</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="font-display text-sm font-semibold">4</span>
                </div>
                <h3 className="font-display text-lg font-medium text-card-foreground">Accountability loop</h3>
                <p className="mt-2 text-sm text-muted-foreground">Regular check-ins keep you aligned with your process and long-term goals.</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">Mentorship</p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Real feedback from real traders.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Information is cheap. Transformation happens through feedback. Your mentor sees your blind spots, challenges your assumptions, and keeps you accountable to the process.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Personalized trade review every week",
                "Direct access to your mentor via private channel",
                "Live market commentary and session prep",
                "Ongoing edge refinement and goal tracking",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-foreground">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-foreground" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Foundation",
      price: "$499",
      period: "one-time",
      description: "Self-paced access to the full curriculum and community.",
      features: ["12-week curriculum", "Private community access", "Weekly group Q&A", "Trade journal templates", "Strategy workbook"],
      cta: "Get started",
      featured: false,
    },
    {
      name: "Mentorship",
      price: "$1,499",
      period: "one-time",
      description: "The complete experience with 1:1 mentorship and feedback.",
      features: [
        "Everything in Foundation",
        "12 weekly 1:1 mentor calls",
        "Asynchronous trade review",
        "Custom playbook development",
        "Priority community support",
        "Lifetime curriculum updates",
      ],
      cta: "Apply now",
      featured: true,
    },
    {
      name: "Elite",
      price: "$2,999",
      period: "one-time",
      description: "Intensive partnership for committed traders.",
      features: [
        "Everything in Mentorship",
        "24 weekly 1:1 mentor calls",
        "Live trading sessions",
        "Direct mentor messaging",
        "Monthly performance audit",
        "Private onboarding intensive",
      ],
      cta: "Apply now",
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="bg-surface px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Invest in your edge.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Choose the level of support that matches your commitment. Every plan includes lifetime access to the curriculum.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-7 ${
                plan.featured
                  ? "border-foreground bg-primary text-primary-foreground"
                  : "border-border bg-card text-card-foreground"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary-foreground px-3 py-1 text-xs font-semibold text-primary">
                  Most popular
                </span>
              )}
              <div>
                <h3 className="font-display text-xl font-medium">{plan.name}</h3>
                <p className={`mt-2 text-sm ${plan.featured ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
              </div>
              <div className="my-6">
                <span className="font-display text-4xl font-medium">{plan.price}</span>
                <span className={`text-sm ${plan.featured ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {" "}
                  / {plan.period}
                </span>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground/10">
                      <span className={`h-1.5 w-1.5 rounded-full ${plan.featured ? "bg-primary-foreground" : "bg-foreground"}`} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="/auth?mode=signup"
                className={`rounded-full px-6 py-3 text-center text-sm font-semibold transition-colors ${
                  plan.featured
                    ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Payment plans available for Mentorship and Elite. Apply to discuss options.
        </p>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      quote: "SHLM replaced the noise with a process. My win rate improved, but more importantly my drawdowns became controlled.",
      author: "Marcus T.",
      role: "Futures trader, 18 months",
    },
    {
      quote: "The 1:1 mentorship is the difference maker. Having someone review my actual trades every week accelerated everything.",
      author: "Daniela R.",
      role: "Forex trader, 8 months",
    },
    {
      quote: "I had taken courses before. This was the first time I left with a system I actually trust and follow.",
      author: "James L.",
      role: "Crypto trader, 12 months",
    },
  ];

  return (
    <section className="bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">Testimonials</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Traders who outlasted the learning curve.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.author} className="flex flex-col justify-between rounded-3xl border border-border bg-card p-7">
              <p className="text-lg leading-relaxed text-card-foreground">“{t.quote}”</p>
              <div className="mt-6">
                <p className="font-display font-medium text-foreground">{t.author}</p>
                <p className="text-sm text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    {
      question: "Do I need trading experience to join?",
      answer: "Foundation is beginner-friendly. Mentorship and Elite are best suited for traders who have placed live trades and want to professionalize their process.",
    },
    {
      question: "How long do I have access to the curriculum?",
      answer: "Lifetime. You keep access to every module, template, and update released after your enrollment.",
    },
    {
      question: "What markets does the program cover?",
      answer: "The principles apply across equities, futures, forex, and crypto. Your mentor helps you adapt the system to your preferred market.",
    },
    {
      question: "Can I upgrade after joining Foundation?",
      answer: "Yes. Foundation members can apply to upgrade to Mentorship or Elite at any time and receive credit toward the higher tier.",
    },
  ];

  return (
    <section id="faq" className="bg-surface px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-16 text-center">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Common questions.
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-6 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-lg font-medium text-card-foreground">{question}</span>
        <span className="ml-4 text-2xl text-muted-foreground transition-transform duration-200" style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
          +
        </span>
      </button>
      {open && (
        <div className="px-6 pb-6">
          <p className="leading-relaxed text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  );
}

function DiscordSection() {
  const inviteUrl = "https://discord.gg/shlm";
  return (
    <section id="discord" className="border-t border-border bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-border bg-card p-10 sm:p-14">
          <div className="grid gap-10 md:grid-cols-[1.2fr,1fr] md:items-center">
            <div>
              <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">Community</p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-card-foreground sm:text-4xl">
                Join the SHLM Discord.
              </h2>
              <p className="mt-6 max-w-lg leading-relaxed text-muted-foreground">
                Where the breakout strategy comes alive. Live setups, daily journals, mentor feedback,
                and a private room of committed traders working the same process.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                <li>• Real-time breakout callouts and market notes</li>
                <li>• Weekly community reviews and Q&amp;A</li>
                <li>• Direct access to mentors and cohort peers</li>
              </ul>
            </div>
            <div className="flex flex-col items-center justify-center gap-4">
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Join the SHLM Discord"
                className="group flex h-24 w-24 items-center justify-center rounded-3xl bg-primary text-primary-foreground transition-transform hover:scale-105"
              >
                <DiscordIcon />
              </a>
              <p className="text-center text-sm text-muted-foreground">Tap the icon to join</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscordIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3c-.2.362-.43.85-.588 1.238a18.27 18.27 0 0 0-5.941 0C9.87 3.85 9.634 3.362 9.43 3a19.74 19.74 0 0 0-3.76 1.37C1.858 10.01.99 15.502 1.42 20.912a19.9 19.9 0 0 0 6.045 3.06c.49-.67.926-1.383 1.302-2.13a12.9 12.9 0 0 1-2.052-.983c.172-.127.34-.26.502-.396 3.955 1.83 8.234 1.83 12.14 0 .164.137.332.27.502.396a12.86 12.86 0 0 1-2.055.984c.376.746.812 1.459 1.302 2.13a19.86 19.86 0 0 0 6.048-3.06c.5-6.28-.86-11.72-3.837-16.544ZM8.02 17.29c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.953-2.42 2.157-2.42 1.21 0 2.178 1.093 2.157 2.42 0 1.334-.953 2.42-2.157 2.42Zm7.962 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.953-2.42 2.157-2.42 1.21 0 2.178 1.093 2.157 2.42 0 1.334-.947 2.42-2.157 2.42Z" />
    </svg>
  );
}

function CtaSection() {
  return (
    <section id="cta" className="bg-primary px-4 py-24 text-primary-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
          Ready to stop guessing and start building your edge?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg opacity-80">
          Applications are reviewed weekly. If SHLM is the right fit, we’ll invite you to enroll and begin the onboarding process.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="/auth?mode=signup"
            className="rounded-full bg-primary-foreground px-8 py-4 text-sm font-semibold text-primary transition-transform hover:scale-[1.02]"
          >
            Create your account
          </a>
          <a
            href="#program"
            className="rounded-full border border-primary-foreground/30 px-8 py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
          >
            Review the curriculum
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <a href="/" className="font-display text-2xl font-semibold tracking-tight text-foreground">
              SHLM
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Premium trading mentorship for traders committed to discipline, process, and long-term performance.
            </p>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">Program</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="#program" className="hover:text-foreground">
                  Curriculum
                </a>
              </li>
              <li>
                <a href="#mentorship" className="hover:text-foreground">
                  Mentorship
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">Account</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="/auth?mode=signin" className="hover:text-foreground">
                  Log in
                </a>
              </li>
              <li>
                <a href="/auth?mode=signup" className="hover:text-foreground">
                  Create account
                </a>
              </li>
              <li>
                <a href="#discord" className="hover:text-foreground">
                  Discord
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} SHLM LLC. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-foreground">
              Privacy
            </a>
            <a href="/terms" className="hover:text-foreground">
              Terms
            </a>
            <a href="/refund" className="hover:text-foreground">
              Refunds
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="16" x2="20" y2="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
