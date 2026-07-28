import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSiteStats, type SiteStats } from "@/lib/site-stats.functions";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { SITE_TIMEZONE, SITE_TIMEZONE_LABEL } from "@/lib/time";

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
      { title: "SHLM — Premium Trading Mentorship" },
      { name: "description", content: "Join SHLM and learn to trade with discipline, structure, and a mentor-backed system built for long-term consistency." },
      { property: "og:title", content: "SHLM — Premium Trading Mentorship" },
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


function LiveClock({ scrolled }: { scrolled: boolean }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: SITE_TIMEZONE,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className={cn(
        "font-mono text-sm tabular-nums tracking-tight",
        scrolled ? "text-muted-foreground" : "text-white/70",
      )}
    >
      {SITE_TIMEZONE_LABEL} {time}
    </span>
  );
}

function Header({
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const navLinks = [
    { label: "Program", href: "/program" },
    { label: "Mentorship", href: "#mentorship" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-md text-foreground"
          : "bg-transparent text-white",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8">
        <a href="/" className="font-display text-lg font-semibold tracking-tight sm:text-xl">
          SHLM
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <LiveClock scrolled={scrolled} />

          <nav className="flex items-center gap-7 lg:gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white",
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/auth?mode=signin"
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              scrolled
                ? "border-border bg-background text-foreground hover:bg-accent"
                : "border-white/20 bg-white/10 text-white hover:bg-white/20",
            )}
          >
            Log in
          </a>
          <a
            href="/auth?mode=signup"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              scrolled
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-white text-foreground hover:bg-white/90",
            )}
          >
            Create account
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <span className="hidden xs:inline-flex">
            <LiveClock scrolled={scrolled} />
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
              scrolled
                ? "border-border text-foreground hover:bg-accent"
                : "border-white/20 text-white hover:bg-white/10",
            )}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={cn("border-t px-4 py-5 md:hidden", scrolled ? "border-border bg-background" : "border-white/10 bg-black/95 backdrop-blur-md")}>
          <nav className="flex flex-col">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex min-h-12 items-center border-b py-3 text-base font-medium transition-colors",
                  scrolled
                    ? "border-border/60 text-foreground hover:text-primary"
                    : "border-white/10 text-white/80 hover:text-white",
                )}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-5 flex flex-col gap-3">
              <a
                href="/auth?mode=signin"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors",
                  scrolled
                    ? "border-border bg-background text-foreground hover:bg-accent"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                Log in
              </a>
              <a
                href="/auth?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors",
                  scrolled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-white text-foreground hover:bg-white/90",
                )}
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
    <section className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Atmospheric dark background with hands reaching toward light"
          className="h-full w-full object-cover"
          width={1920}
          height={1088}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
      </div>

      {/* Crosshair / reticle accents */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="absolute left-1/4 top-1/2 h-6 w-px bg-white/20" />
        <div className="absolute left-1/4 top-[calc(50%-12px)] h-px w-3 bg-white/20" />
        <div className="absolute left-1/4 top-[calc(50%+12px)] h-px w-3 bg-white/20" />
        <div className="absolute left-1/2 top-1/2 h-6 w-px bg-white/20" />
        <div className="absolute left-1/2 top-[calc(50%-12px)] h-px w-3 bg-white/20" />
        <div className="absolute left-1/2 top-[calc(50%+12px)] h-px w-3 bg-white/20" />
        <div className="absolute left-3/4 top-1/2 h-6 w-px bg-white/20" />
        <div className="absolute left-3/4 top-[calc(50%-12px)] h-px w-3 bg-white/20" />
        <div className="absolute left-3/4 top-[calc(50%+12px)] h-px w-3 bg-white/20" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-36 pt-28 text-center sm:px-6 sm:pb-32 sm:pt-32 lg:px-8">
        <p className="font-display text-[11px] font-medium uppercase tracking-[0.28em] text-white/60 sm:text-sm sm:tracking-[0.25em]">
          Premium trading mentorship
        </p>
        <h1 className="mt-5 text-balance font-display text-[clamp(4.5rem,17vw,12rem)] font-medium leading-[0.85] tracking-tighter text-white sm:mt-6">
          &ldquo;SHLM&rdquo;
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-8 sm:text-lg md:text-xl">
          A mentorship program for traders who want a structured system, real feedback, and the discipline to perform consistently in any market.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <a
            href="#pricing"
            className="flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-black transition-transform hover:scale-[1.02] hover:bg-white/90 sm:min-h-0 sm:py-3.5"
          >
            Start your application
          </a>
          <a
            href="/program"
            className="group flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:min-h-0 sm:py-3.5"
          >
            Explore the program
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        </div>
        <div className="mt-10 flex items-center justify-center sm:mt-12">
          <LiveEnrollmentTicker />
        </div>

      </div>

      {/* Social links — bottom left */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 sm:bottom-8 sm:left-6 sm:translate-x-0 lg:left-8">
        <a
          href="https://x.com/thevoiceofjoshua"
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
          aria-label="X (Twitter)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <a
          href="https://instagram.com/thevoiceofjoshua"
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Instagram"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </a>
        <a
          href="https://discord.gg/nZRhH42j"
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Discord"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 00-.0852.0085c-.1289.1109-.2612.2219-.3949.3279a.0743.0743 0 00.0099.1204c1.9185.875 3.9675 1.323 6.1024 1.323 2.1349 0 4.1839-.448 6.1023-1.323 2.1349 0 4.1839-.448 6.1023-1.323a.0737.0737 0 00.0099-.1204c-.1337-.106-.267-.217-.3949-.3279a.077.077 0 00-.0852-.0085c-.5979.3428-1.2194.6447-1.8722.8923a.076.076 0 00-.0416.1057c.3529.699 1.0014 1.3638 1.226 1.9942a.0778.0778 0 00.0842.0276c1.9611-.6066 3.9495-1.5219 6.0023-3.0294a.082.082 0 00.0312-.0561c.5006-5.177-.9432-9.6734-3.5487-13.6604a.061.061 0 00-.0312-.0276zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9565-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9565 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9565-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
          </svg>
        </a>
      </div>

    </section>
  );
}

const ENROLLMENTS = [
  { name: "Marcus T.", city: "Austin, TX", tier: "Mentorship" },
  { name: "Priya S.", city: "London, UK", tier: "Elite" },
  { name: "Daniel R.", city: "Miami, FL", tier: "Foundation" },
  { name: "Chidi O.", city: "Lagos, NG", tier: "Mentorship" },
  { name: "Sofia L.", city: "Madrid, ES", tier: "Mentorship" },
  { name: "Kenji A.", city: "Tokyo, JP", tier: "Elite" },
  { name: "Amara J.", city: "Atlanta, GA", tier: "Foundation" },
  { name: "Liam W.", city: "Toronto, CA", tier: "Mentorship" },
  { name: "Noor H.", city: "Dubai, AE", tier: "Elite" },
  { name: "Ethan B.", city: "Chicago, IL", tier: "Mentorship" },
  { name: "Isabella F.", city: "São Paulo, BR", tier: "Foundation" },
  { name: "Jonas M.", city: "Berlin, DE", tier: "Mentorship" },
  { name: "Ava P.", city: "New York, NY", tier: "Elite" },
  { name: "Ravi K.", city: "Mumbai, IN", tier: "Mentorship" },
  { name: "Zara N.", city: "Cape Town, ZA", tier: "Foundation" },
];

function LiveEnrollmentTile() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ENROLLMENTS.length);
        setVisible(true);
      }, 520);
    }, 6800);
    return () => clearInterval(cycle);
  }, []);

  const person = ENROLLMENTS[index];
  const initials = person.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="text-center">
      <div
        className={cn(
          "mx-auto flex min-h-[64px] items-center justify-center gap-3 transition-all duration-500 ease-out sm:min-h-[72px]",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground font-display text-sm font-medium text-background sm:h-12 sm:w-12">
          {initials}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground" />
            </span>
            <p className="font-display text-sm font-medium text-foreground sm:text-base">
              {person.name}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Just enrolled · {person.tier}
          </p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/80">
            {person.city}
          </p>
        </div>
      </div>
    </div>
  );
}

function LiveEnrollmentTicker() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ENROLLMENTS.length);
        setVisible(true);
      }, 520);
    }, 6800);
    return () => clearInterval(cycle);
  }, []);

  const person = ENROLLMENTS[index];

  return (
    <div className="flex items-center gap-3 text-xs text-white/70 sm:text-sm">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      <span
        className={cn(
          "transition-all duration-500 ease-out",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
        )}
      >
        <span className="font-medium text-white">{person.name}</span>
        <span className="text-white/50"> just enrolled · {person.tier} · {person.city}</span>
      </span>
    </div>
  );
}

function StatsSection({ stats }: { stats: SiteStats }) {
  const items = [
    { value: "12", label: "Week structured program" },
    { value: "1:1", label: "Mentor relationship" },
    { value: stats.results_value, label: stats.results_label },
  ];

  return (
    <section className="border-y border-border bg-surface px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-4">
        <LiveEnrollmentTile />
        {items.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center text-center">
            <p className="font-display text-4xl font-medium leading-none text-foreground sm:text-4xl lg:text-5xl">{stat.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
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
      to: "/features/curriculum" as const,
    },
    {
      title: "Live mentorship",
      description: "Weekly 1:1 calls with experienced traders who review your trades, correct mistakes, and sharpen your edge.",
      span: "",
      to: "/features/mentorship" as const,
    },
    {
      title: "Risk architecture",
      description: "Position sizing, drawdown rules, and psychological guardrails built into your daily process.",
      span: "",
      to: "/features/risk" as const,
    },
    {
      title: "Private community",
      description: "Access a focused network of traders sharing setups, journals, and feedback in real time.",
      span: "md:col-span-2",
      to: "/features/community" as const,
    },
  ];

  return (
    <section className="bg-background px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">What you receive</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Everything needed to trade like a professional.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              to={feature.to}
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
            </Link>
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
    <section id="program" className="bg-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
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
    <section id="mentorship" className="bg-background px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
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
  const checkout = useServerFn(createCheckoutSession);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (tier: "foundation" | "mentorship" | "elite") => {
    try {
      setLoadingTier(tier);
      const { url } = await checkout({ data: { tier, origin: window.location.origin } });
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Unable to start checkout. Please try again or contact support.");
      setLoadingTier(null);
    }
  };

  const plans = [
    {
      key: "foundation" as const,
      name: "Foundation",
      price: "$499",
      period: "one-time",
      description: "Self-paced access to the full curriculum and community.",
      features: ["12-week curriculum", "Private community access", "Weekly group Q&A", "Trade journal templates", "Strategy workbook"],
      cta: "Enroll now",
      featured: false,
    },
    {
      key: "mentorship" as const,
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
      cta: "Enroll now",
      featured: true,
    },
    {
      key: "elite" as const,
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
      cta: "Enroll now",
      featured: false,
    },
  ];


  return (
    <section id="pricing" className="bg-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
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

        <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-7 transition-all sm:p-8 ${
                plan.featured
                  ? "border-foreground bg-primary text-primary-foreground shadow-xl shadow-black/10 lg:-my-2 lg:scale-[1.03] lg:p-9"
                  : "border-border bg-card text-card-foreground hover:-translate-y-0.5 hover:shadow-lg"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-foreground px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary shadow-sm sm:left-8 sm:translate-x-0">
                  Most popular
                </span>
              )}
              <div>
                <h3 className="font-display text-xl font-medium sm:text-2xl">{plan.name}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${plan.featured ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
              </div>
              <div className="my-6 flex items-baseline gap-2">
                <span className="font-display text-4xl font-medium sm:text-5xl">{plan.price}</span>
                <span className={`text-sm ${plan.featured ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  / {plan.period}
                </span>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${plan.featured ? "bg-primary-foreground/15" : "bg-foreground/10"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${plan.featured ? "bg-primary-foreground" : "bg-foreground"}`} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href={`/apply?tier=${plan.key}`}
                className={`flex min-h-12 items-center justify-center rounded-full px-6 text-center text-sm font-semibold transition-transform hover:scale-[1.02] ${
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
    <section className="bg-background px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
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
    <section id="faq" className="bg-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
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
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card transition-shadow", open && "shadow-md")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
        aria-expanded={open}
      >
        <span className="font-display text-base font-medium text-card-foreground sm:text-lg">{question}</span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-xl text-muted-foreground transition-transform duration-200"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-6 leading-relaxed text-muted-foreground sm:px-6">{answer}</p>
        </div>
      </div>
    </div>
  );
}

function DiscordSection() {
  const inviteUrl = "https://discord.gg/nZRhH42j";
  return (
    <section id="discord" className="border-t border-border bg-background px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 lg:p-14">
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
    <section id="cta" className="bg-primary px-4 py-20 text-primary-foreground sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-medium leading-[1.05] tracking-tight">
          Ready to stop guessing and start building your edge?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed opacity-80 sm:text-lg">
          Applications are reviewed weekly. If SHLM is the right fit, we’ll invite you to enroll and begin the onboarding process.
        </p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
          <a
            href="/auth?mode=signup"
            className="flex min-h-12 items-center justify-center rounded-full bg-primary-foreground px-8 text-sm font-semibold text-primary transition-transform hover:scale-[1.02]"
          >
            Create your account
          </a>
          <a
            href="#program"
            className="flex min-h-12 items-center justify-center rounded-full border border-primary-foreground/30 px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
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
