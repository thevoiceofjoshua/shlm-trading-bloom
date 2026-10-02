import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { HomeButton } from "@/components/HomeButton";
import { supabase } from "@/integrations/supabase/client";
import { useAdminMode } from "@/hooks/use-admin-mode";
import { getWeeklyBehavior } from "@/lib/weekly-behavior.functions";
import type { DayStatus } from "@/lib/weekly-behavior.server";
import { WeeklyNotificationBanner, WeeklyNotificationCenter } from "@/components/hub/WeeklyNotifications";

export const Route = createFileRoute("/centre_/weekly-behavior")({
  component: WeeklyBehaviorPage,
  head: () => ({
    meta: [
      { title: "Weekly Behavior — SHLM Centre" },
      { name: "description", content: "Expected NY session behavior by day of the week, with a live Monday/Friday choppy-or-fast read." },
      { property: "og:title", content: "Weekly Behavior — SHLM Centre" },
      { property: "og:description", content: "Day-of-week NY session behavior context for SHLM members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const FIXED: Record<number, string> = {
  2: "MANIPULATION → EXPANSION",
  3: "MANIPULATION → EXPANSION",
  4: "BIG PUSH / EXPANSION",
};
const NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function WeeklyBehaviorPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", redirect: "/centre/weekly-behavior" }, replace: true });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  const { viewAsMember } = useAdminMode();
  const fetchWeekly = useServerFn(getWeeklyBehavior);
  const { data: res, isLoading } = useQuery({
    queryKey: ["weekly-behavior", viewAsMember],
    queryFn: () => fetchWeekly({ data: { asMember: viewAsMember } }),
    enabled: ready,
    retry: false,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const locked = res && !res.access.hasAccess && !res.access.isAdmin;
  const data = res?.data ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link to="/centre" className="min-w-0 truncate font-display text-base font-semibold tracking-tight sm:text-xl">
            ← SHLM Centre
          </Link>
          <HomeButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
        {res && !locked && <WeeklyNotificationBanner enabled={true} />}
        <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Weekly Behavior</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          How the NY session tends to behave each day. Context only — not an entry signal.
        </p>

        {!ready || isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">Loading weekly behavior…</p>
        ) : locked ? (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground">Weekly Behavior is for active SHLM members.</p>
            <Link to="/apply" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
              Apply to enroll
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((d) => (
              <DayCard
                key={d}
                day={d}
                today={data?.todayDow === d}
                status={d === 1 ? data?.monday ?? null : d === 5 ? data?.friday ?? null : undefined}
                note={data?.fixedNote?.day === d ? data.fixedNote.text : null}
              />
            ))}
          </div>
        )}
        {res && !locked && <WeeklyNotificationCenter enabled={true} />}
      </main>
    </div>
  );
}

function DayCard({ day, today, status, note }: { day: number; today: boolean; status: DayStatus | null | undefined; note?: string | null }) {
  const dynamic = day === 1 || day === 5;
  let headline: string;
  let sub: string | null = null;
  let tone = "border-border bg-surface text-foreground";

  if (!dynamic) {
    headline = FIXED[day];
    sub = note ?? null;
  } else if (!status) {
    headline = "WAITING FOR DATA";
    sub = "Market data feed unavailable";
    tone = "border-border bg-surface text-muted-foreground";
  } else if (status.kind === "classified") {
    headline = status.label;
    sub = `${status.developing ? "Developing — " : ""}${status.reason}`;
    tone = status.label === "FAST"
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-surface text-foreground";
  } else if (status.kind === "waiting") {
    headline = "WAITING FOR DATA";
    sub = status.reason;
    tone = "border-border bg-surface text-muted-foreground";
  } else {
    headline = "FAST / CHOPPY / SLOW / RANGE";
    sub = status.reason;
    tone = "border-border bg-surface text-muted-foreground";
  }

  return (
    <div className={`min-w-0 rounded-2xl border bg-card p-4 sm:p-5 ${today ? "border-foreground" : "border-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{NAMES[day]}</p>
        {today && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest">Today</span>
        )}
      </div>
      <span className={`mt-3 inline-flex max-w-full rounded-full border px-3 py-1.5 font-display text-sm font-semibold tracking-tight ${tone}`}>
        {headline}
      </span>
      {sub && <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p>}
      {dynamic && <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">Live classifier</p>}
    </div>
  );
}
