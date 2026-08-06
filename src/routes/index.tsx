import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSiteStats, type SiteStats } from "@/lib/site-stats.functions";
import { getReviews, type Review } from "@/lib/reviews.functions";
import { ReviewsCarousel } from "@/components/ReviewsCarousel";
import { DISCORD_JOIN_URL } from "@/lib/external-links";
import { useAuthUser } from "@/hooks/use-auth-user";
import { AccountMenu } from "@/components/AccountMenu";

import { SITE_TIMEZONE, SITE_TIMEZONE_LABEL } from "@/lib/time";
import chartNasdaq from "@/assets/chart-nasdaq.png.asset.json";
import chartDow from "@/assets/chart-dow.png.asset.json";
import chartEntry from "@/assets/chart-entry.png.asset.json";
import pnl5145 from "@/assets/pnl-5145.jpg.asset.json";
import liveTrade from "@/assets/live-trade-gold.mp4.asset.json";
import liveTradePoster from "@/assets/live-trade-poster.jpg.asset.json";


import pnlCard from "@/assets/pnl-card.png.asset.json";
import accountsPnl from "@/assets/accounts-pnl.png.asset.json";
import payouts from "@/assets/payouts.jpg.asset.json";

import heroBg from "@/assets/hero-bg.jpg";

const siteStatsQuery = (fn: () => Promise<SiteStats>) =>
  queryOptions({ queryKey: ["site_stats"], queryFn: fn, staleTime: 30_000 });

const reviewsQuery = (fn: () => Promise<Review[]>) =>
  queryOptions({ queryKey: ["reviews"], queryFn: fn, staleTime: 60_000 });

const HOMEPAGE_FAQS = [
  {
    q: "Do I need trading experience to join?",
    a: "Every level is welcome. Beginners get the full foundation, while experienced traders use the mentorship to professionalize their process.",
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
    q: "What happens after the 8 weeks?",
    a: "You can extend your access for $150 per month, for as long as you want to keep the mentorship, live sessions, and community.",
  },
];

export const Route = createFileRoute("/")({
  component: Index,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(siteStatsQuery(() => getSiteStats())),
      context.queryClient.ensureQueryData(reviewsQuery(() => getReviews())),
    ]);
  },
  head: () => ({
    meta: [
      { title: "SHLM" },
      { name: "description", content: "Join SHLM and learn to trade with discipline, structure, and a mentor-backed system built for long-term consistency." },
      { property: "og:title", content: "SHLM" },
      { property: "og:description", content: "Join SHLM and learn to trade with discipline, structure, and a mentor-backed system built for long-term consistency." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shlmtrdng.com/" },
      { property: "og:image", content: "https://shlmtrdng.com/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://shlmtrdng.com/og-image.jpg" },
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
        <ProofSection />
        <CtaSection />
        <TestimonialsSection />
        
        <PricingSection />
        <FaqSection />
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

function PromoBanner() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText("1MILL");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <div className="bg-foreground text-background">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-[11px] font-medium sm:gap-3 sm:text-xs">
        <span className="hidden h-1.5 w-1.5 rounded-full bg-background/70 sm:inline-block" aria-hidden />
        <span className="uppercase tracking-[0.18em]">
          Limited offer — Use code{" "}
          <button
            type="button"
            onClick={copy}
            className={cn(
              "mx-0.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono font-bold tracking-widest text-background transition-colors",
              copied ? "bg-background/25" : "bg-background/10 hover:bg-background/20",
            )}
            aria-label="Copy promo code 1MILL"
          >
            1MILL
          </button>{" "}
          for 20% off
        </span>
      </div>
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
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuthUser();
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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;
    const el = document.getElementById(href.slice(1));
    if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    history.replaceState(null, "", href);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-md text-foreground"
          : "bg-transparent text-white",
      )}
    >
      <PromoBanner />
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
                onClick={(e) => handleNavClick(e, link.href)}
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
          {user ? (
            <AccountMenu user={user} scrolled={scrolled} />
          ) : (
            <>
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
                    : "bg-white text-black hover:bg-white/90",
                )}
              >
                Create account
              </a>
            </>
          )}
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
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleNavClick(e, link.href);
                }}
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
              {user ? (
                <AccountMenu user={user} scrolled={scrolled} variant="mobile" />
              ) : (
                <>
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
                        : "bg-white text-black hover:bg-white/90",
                    )}
                  >
                    Create account
                  </a>
                </>
              )}
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
        <h1 className="animate-hero-pulse inline-block text-balance font-display text-[clamp(4.5rem,17vw,12rem)] font-medium leading-[0.85] tracking-[0.05em] text-white [will-change:transform]">
          SHLM
        </h1>
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
      </div>

    </section>
  );
}

const ENROLLMENTS = [
  { name: "Marcus T.", city: "Austin, TX", tier: "Intermediate" },
  { name: "Priya S.", city: "London, UK", tier: "Advanced" },
  { name: "Daniel R.", city: "Miami, FL", tier: "Beginner" },
  { name: "Chidi O.", city: "Lagos, NG", tier: "Intermediate" },
  { name: "Sofia L.", city: "Madrid, ES", tier: "Intermediate" },
  { name: "Kenji A.", city: "Tokyo, JP", tier: "Advanced" },
  { name: "Amara J.", city: "Atlanta, GA", tier: "Beginner" },
  { name: "Liam W.", city: "Toronto, CA", tier: "Intermediate" },
  { name: "Noor H.", city: "Dubai, AE", tier: "Advanced" },
  { name: "Ethan B.", city: "Chicago, IL", tier: "Intermediate" },
  { name: "Isabella F.", city: "São Paulo, BR", tier: "Beginner" },
  { name: "Jonas M.", city: "Berlin, DE", tier: "Intermediate" },
  { name: "Ava P.", city: "New York, NY", tier: "Advanced" },
  { name: "Ravi K.", city: "Mumbai, IN", tier: "Intermediate" },
  { name: "Zara N.", city: "Cape Town, ZA", tier: "Beginner" },
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
    <div
      className={cn(
        "flex items-center gap-4 transition-all duration-500 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
      )}
    >
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/10 font-mono text-sm font-medium tracking-tight text-background ring-1 ring-background/20">
        {initials}
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-background opacity-60" />
          <span className="relative inline-flex h-full w-full rounded-full bg-background" />
        </span>
      </div>
      <div className="min-w-0 text-left">
        <div className="flex items-center gap-2">
          <p className="font-display text-sm font-medium text-background sm:text-base">
            {person.name}
          </p>
          <span className="rounded-full bg-background/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background/80">
            Just enrolled
          </span>
        </div>
        <p className="text-xs text-background/60 sm:text-sm">
          {person.tier} · {person.city}
        </p>
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
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText("1MILL");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const items = [
    { value: "12", label: "Week structured program" },
    { value: "1:1", label: "Mentor relationship" },
    {
      value: "20% OFF",
      label: (
        <span className="inline-flex items-center gap-1">
          With code
          <button
            type="button"
            onClick={copyCode}
            className={cn(
              "rounded-sm px-1 py-0.5 font-mono font-bold tracking-wider text-background transition-colors",
              copied ? "bg-background/25" : "bg-background/10 hover:bg-background/20",
            )}
            aria-label="Copy promo code 1MILL"
          >
            1MILL
          </button>
        </span>
      ),
    },
  ];

  return (
    <section className="bg-foreground px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-0">
          <div className="flex items-center justify-center sm:col-span-3 lg:col-span-1 lg:justify-start lg:pr-10">
            <LiveEnrollmentTile />
          </div>
          {items.map((stat) => (
            <div
              key={typeof stat.label === "string" ? stat.label : "20-off"}
              className="flex flex-col items-center justify-center text-center lg:border-l lg:border-background/10 lg:pl-10"
            >
              <p className="font-display text-5xl font-medium leading-none tracking-tight text-background sm:text-6xl">
                {stat.value}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-background/60">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function FeaturesSection() {
  const features = [
    {
      title: "Structured curriculum",
      description: "An 8-week progression from market structure to advanced execution. No shortcuts. Every module builds on the last.",
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
    { week: "WEEK 01", title: "Foundations & market structure", description: "Reading price action, liquidity, and the anatomy of a trend." },
    { week: "WEEK 02", title: "Strategy development", description: "Building a rules-based system with entry, exit, and invalidation criteria." },
    { week: "WEEK 03-04", title: "Risk & position sizing", description: "Defining risk per trade, correlation limits, and portfolio heat." },
    { week: "WEEK 05", title: "Execution & journaling", description: "Order flow, slippage management, and structured trade review." },
    { week: "WEEK 06", title: "Psychology & discipline", description: "Emotional regulation, routines, and protecting your edge." },
    { week: "WEEK 07-08", title: "Live trading & feedback", description: "Trade live with mentor oversight and refine your personal playbook." },
  ];

  return (
    <section id="program" className="bg-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">The curriculum</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Eight weeks. One clear path.
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

const PROMO_CODE = "1MILL";
const PROMO_DISCOUNT = 0.2;

function formatMoney(amount: number) {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function PricingSection() {
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const applyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (code === PROMO_CODE) {
      setAppliedPromo(code);
      setPromoError(null);
    } else {
      setAppliedPromo(null);
      setPromoError("That code isn't valid.");
    }
  };

  const clearPromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  const discounted = appliedPromo === PROMO_CODE;
  const basePrice = 500;
  const monthlyExtension = 150;
  const finalPrice = discounted ? Math.round(basePrice * (1 - PROMO_DISCOUNT)) : basePrice;
  const applyHref = `/apply${discounted ? `?promo=${PROMO_CODE}` : ""}`;

  const included = [
    "8 weeks of full mentorship access",
    "Complete breakout strategy curriculum",
    "Weekly live sessions and trade reviews",
    "Risk and position sizing framework",
    "Private community access",
    "Trade journal and playbook templates",
  ];

  return (
    <section id="pricing" className="bg-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center sm:mb-14">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            One price. Eight weeks.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            A single one-time payment for the full program. Want to keep going after eight weeks?
            Extend month to month for {formatMoney(monthlyExtension)}.
          </p>
        </div>

        <div className="mx-auto mb-10 max-w-xl">
          <form
            onSubmit={applyPromo}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:gap-3 sm:p-3",
              discounted ? "border-foreground bg-foreground/[0.03]" : "border-border bg-card",
            )}
          >
            <label htmlFor="promo" className="flex-1">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Promo code
              </span>
              <input
                id="promo"
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  setPromoError(null);
                }}
                placeholder="Enter code"
                autoComplete="off"
                spellCheck={false}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 font-mono text-sm uppercase tracking-widest text-foreground focus:border-foreground focus:outline-none"
                disabled={discounted}
              />
            </label>
            {discounted ? (
              <button
                type="button"
                onClick={clearPromo}
                className="h-11 shrink-0 rounded-xl border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:mt-[22px]"
              >
                Remove
              </button>
            ) : (
              <button
                type="submit"
                className="h-11 shrink-0 rounded-xl bg-foreground px-6 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 sm:mt-[22px]"
              >
                Apply
              </button>
            )}
          </form>
          {promoError && <p className="mt-2 text-center text-xs text-destructive">{promoError}</p>}
          {discounted && (
            <p className="mt-2 text-center text-xs font-medium uppercase tracking-widest text-foreground">
              Code <span className="font-mono">{appliedPromo}</span> applied — 20% off enrollment
            </p>
          )}
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3 lg:items-stretch lg:gap-8">
          <div className="relative flex flex-col rounded-3xl border border-foreground bg-primary p-7 text-primary-foreground shadow-xl shadow-black/10 sm:p-9">

            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-foreground px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary shadow-sm sm:left-9 sm:translate-x-0">
              Full program
            </span>
            <div>
              <h3 className="font-display text-xl font-medium sm:text-2xl">SHLM Mentorship</h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">
                Everything you need to trade the breakout strategy with discipline — mentorship,
                curriculum and community for a full 8 weeks.
              </p>
            </div>
            <div className="my-6">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-medium">{formatMoney(finalPrice)}</span>
                <span className="text-sm text-primary-foreground/70">/ one-time · 8 weeks</span>
              </div>
              {discounted && (
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="text-primary-foreground/60 line-through">{formatMoney(basePrice)}</span>
                  <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
                    Save 20%
                  </span>
                </div>
              )}
            </div>
            <ul className="mb-8 flex-1 space-y-3">
              {included.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={applyHref}
              className="flex min-h-12 items-center justify-center rounded-full bg-primary-foreground px-6 text-center text-sm font-semibold text-primary transition-transform hover:scale-[1.02] hover:bg-primary-foreground/90"
            >
              Enroll now
            </a>
          </div>

          <div className="relative flex flex-col rounded-3xl border border-border bg-card p-7 text-card-foreground sm:p-9">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-background shadow-sm sm:left-9 sm:translate-x-0">
              Free access
            </span>
            <div>
              <h3 className="font-display text-xl font-medium sm:text-2xl">Live trading</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sit in on live sessions and watch the breakout strategy traded in real time. No card,
                no commitment.
              </p>
            </div>
            <div className="my-6 flex items-baseline gap-2">
              <span className="font-display text-5xl font-medium">$0</span>
              <span className="text-sm text-muted-foreground">/ always free</span>
            </div>
            <ul className="mb-8 flex-1 space-y-3">
              {[
                "Live trading sessions as they happen",
                "Watch real entries, stops and targets",
                "Live market commentary",
                "Community chat access",
                "No payment details required",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href="/discord"
              className="flex min-h-12 items-center justify-center rounded-full border border-foreground bg-background px-6 text-center text-sm font-semibold text-foreground transition-transform hover:scale-[1.02] hover:bg-accent"
            >
              Join free
            </a>
          </div>

          <div className="flex flex-col rounded-3xl border border-border bg-card p-7 text-card-foreground sm:p-9">

            <div>
              <h3 className="font-display text-xl font-medium sm:text-2xl">Monthly extension</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Optional. Only after your first 8 weeks — add months whenever you want to keep going.
              </p>
            </div>
            <div className="my-6 flex items-baseline gap-2">
              <span className="font-display text-4xl font-medium">{formatMoney(monthlyExtension)}</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <ul className="mb-8 flex-1 space-y-3">
              {[
                "Continued mentorship and live sessions",
                "Continued community access",
                "Extend one month at a time",
                "Cancel simply by not extending",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Extensions are purchased from your member dashboard once you’re enrolled.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          One-time {formatMoney(basePrice)} enrollment · {formatMoney(monthlyExtension)}/month after 8
          weeks if you choose to extend.
        </p>
      </div>
    </section>
  );
}


function ProofSection() {
  const tiles = [
    {
      src: chartNasdaq.url,
      alt: "Micro E-mini Nasdaq-100 five-minute chart with a breakout entry, stop loss and take profit zones marked",
      caption: "Nasdaq breakout — entry, stop and target mapped before the trade.",
      className: "md:col-span-4",
      aspect: "min-h-[280px] sm:min-h-[380px]",
    },
    {
      src: payouts.url,
      alt: "Three payout notifications from a proprietary trading firm",
      caption: "Payouts, not promises.",
      className: "md:col-span-2",
      aspect: "min-h-[220px]",
      fit: "object-contain p-3",
    },
    {
      src: chartDow.url,
      alt: "Micro E-mini Dow futures chart showing a break of structure and a managed short position",
      caption: "Break of structure, then execution.",
      className: "md:col-span-3",
      aspect: "min-h-[220px]",
    },
    {
      src: pnlCard.url,
      alt: "Group profit and loss card showing a daily group result",
      caption: "Group P&L, tracked daily.",
      className: "md:col-span-3",
      aspect: "min-h-[220px]",
    },
    {
      src: accountsPnl.url,
      alt: "Funded account table showing per-account totals and drawdown distance",
      caption: "Risk-managed across every funded account.",
      className: "md:col-span-6",
      aspect: "min-h-[140px] sm:min-h-[180px]",
      fit: "object-contain p-4",
    },
    {
      src: liveTrade.url,
      kind: "video" as const,
      alt: "Screen recording of a live Micro Gold futures trade showing a position up 2,775 dollars",
      caption: "Live execution — Micro Gold, +$2,775 in open profit.",
      className: "md:col-span-2",
      aspect: "min-h-[420px] sm:min-h-[520px]",
    },
    {
      src: pnl5145.url,
      alt: "Daily profit and loss card showing plus 5,145 dollars",
      caption: "+$5,145 in a single session.",
      className: "md:col-span-4",
      aspect: "min-h-[240px] sm:min-h-[520px]",
      fit: "object-contain p-3",
    },
    {
      src: chartEntry.url,
      alt: "Close-up chart of a reversal entry with risk and reward zones",
      caption: "One setup. Repeated with discipline.",
      className: "md:col-span-6",
      aspect: "min-h-[280px] sm:min-h-[420px]",
    },
  ];


  return (
    <section id="proof" className="bg-background px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl sm:mb-16">
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
            The work
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Real charts. Real execution. Real payouts.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every setup you see here comes from the same breakout framework taught inside the
            mentorship — marked in advance, executed with defined risk.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-6">
          {tiles.map((tile) => (
            <figure
              key={tile.src}
              className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card ${tile.className}`}
            >
              <div className={`relative w-full flex-1 overflow-hidden ${tile.aspect}`}>
                {"kind" in tile && (tile as { kind: string }).kind === "video" ? (
                  <video
                    src={tile.src}
                    aria-label={tile.alt}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster={liveTradePoster.url}

                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                ) : (
                  <img
                    src={tile.src}
                    alt={tile.alt}
                    loading="lazy"
                    className={`absolute inset-0 h-full w-full object-center transition-transform duration-700 ease-out group-hover:scale-[1.03] ${"fit" in tile ? (tile as { fit: string }).fit : "object-cover"}`}
                  />
                )}
              </div>

              <figcaption className="border-t border-border px-5 py-4 text-sm text-muted-foreground">
                {tile.caption}
              </figcaption>
            </figure>
          ))}
        </div>


        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Past performance is not indicative of future results. Trading futures involves substantial
          risk of loss.
        </p>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const getFn = useServerFn(getReviews);
  const { data: reviews } = useSuspenseQuery(reviewsQuery(() => getFn()));

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="bg-background px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:mb-16">
          <div className="min-w-0 max-w-2xl">
            <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">Reviews</p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Traders who outlasted the learning curve.
            </h2>
          </div>
          <p className="hidden shrink-0 text-sm text-muted-foreground sm:block">
            {reviews.length} verified reviews
          </p>
        </div>

        <ReviewsCarousel reviews={reviews} />
      </div>
    </section>
  );
}


function FaqSection() {
  const faqs = [
    {
      question: "Do I need trading experience to join?",
      answer: "Every level is welcome. Beginners get the full foundation, while experienced traders use the mentorship to professionalize their process.",
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
      question: "What happens after the 8 weeks?",
      answer: "You can extend your access for $150 per month, for as long as you want to keep the mentorship, live sessions, and community.",
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
  return (
    <section id="discord" className="bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex max-w-3xl items-center justify-center">
        <a
          href={DISCORD_JOIN_URL}
          target="_blank"
          rel="noopener"
          aria-label="Join the SHLM Discord"
          className="group flex h-24 w-24 items-center justify-center rounded-3xl bg-foreground text-background transition-all hover:scale-105 hover:rounded-2xl sm:h-28 sm:w-28"
        >
          <DiscordIcon />
        </a>
      </div>
    </section>
  );
}

function DiscordIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
            href="/apply"
            className="flex min-h-12 items-center justify-center rounded-full bg-primary-foreground px-8 text-sm font-semibold text-primary transition-transform hover:scale-[1.02]"
          >
            Enroll now
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
  const { user } = useAuthUser();
  return (
    <footer className="border-t border-border bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <a href="/" className="animate-hero-breathe inline-block font-display text-4xl font-semibold tracking-tight text-foreground">
              SHLM
            </a>
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
              {user ? (
                <li>
                  <a href="/dashboard" className="hover:text-foreground">
                    Dashboard
                  </a>
                </li>
              ) : (
                <>
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
                </>
              )}
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
