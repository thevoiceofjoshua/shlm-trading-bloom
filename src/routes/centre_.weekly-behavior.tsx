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
import { ForecastContext } from "@/components/hub/ForecastContext";

export const Route = createFileRoute("/centre_/weekly-behavior")({
  component: WeeklyBehaviorPage,
  head: () => ({
    meta: [
      { title: "Weekly Behavior — SHLM Centre" },
      { name: "description", content: "Dynamic NASDAQ, US30 and Gold session context with immutable forecast checkpoints and real outcomes." },
      { property: "og:title", content: "Weekly Behavior — SHLM Centre" },
      { property: "og:description", content: "Three-market session context, sourced observations and forecast evidence for SHLM members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

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
          Dynamic session observations from NQ, YM and GC futures. Delayed data · context only.
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
          <div className="mt-6 space-y-6"><ForecastContext/>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((d) => (
              <DayCard
                key={d}
                day={d}
                today={data?.todayDow === d}
                status={data?.todayDow===d?data.current?.nasdaq??null:{kind:"not_today",reason:"No current-session observation for this day"}}
                us30={data?.todayDow===d?data.current?.us30:null}
                gold={data?.todayDow===d?data.current?.gold:null}
              />
            ))}
          </div></div>
        )}
        {res && !locked && <WeeklyNotificationCenter enabled={true} />}
      </main>
    </div>
  );
}


function readText(s: DayStatus | null | undefined): string | null {
  if (!s) return null;
  if (s.kind === "classified") return `${s.label}${s.developing ? " (developing)" : ""}`;
  if (s.kind === "waiting" && s.reason !== "Market data feed unavailable" && s.reason !== "US30 data unavailable") return "WAITING FOR DATA";
  return null;
}
function SymbolReads({ nq, ym, gc }: { nq: DayStatus | null | undefined; ym: DayStatus | null | undefined; gc?:DayStatus|null }) {
  const rows = [["NASDAQ", readText(nq)], ["US30", readText(ym)], ["Gold",readText(gc)]].filter((r) => r[1]);
  if (!rows.length) return null;
  return (
    <div className="mt-2 space-y-0.5">
      {rows.map(([n, t]) => (
        <p key={n} className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">{n}:</span> {t}</p>
      ))}
    </div>
  );
}

function DayCard({ day, today, status, us30, gold }: { day: number; today: boolean; status: DayStatus | null | undefined; us30?: DayStatus | null; gold?:DayStatus|null }) {
  const dynamic = true;
  let headline: string;
  let sub: string | null = null;
  let tone = "border-border bg-surface text-foreground";

  if (!status || (status.kind === "waiting" && status.reason === "Market data feed unavailable")) {
    // Feed failed — hide the reading rather than show a broken state.
    return null;
  } else if (status.kind === "classified") {
    headline = status.label;
    sub = `${status.developing ? "Developing — " : ""}${status.reason}${
      status.phase === "live" && status.premarketLabel ? ` · Premarket read was ${status.premarketLabel}` : ""
    }`;
    tone = status.label === "FAST"
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-surface text-foreground";
  } else if (status.kind === "waiting") {
    headline = "WAITING FOR DATA";
    sub = status.reason;
    tone = "border-border bg-surface text-muted-foreground";
  } else {
    headline = "Not issued";
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
      {dynamic && <SymbolReads nq={status} ym={us30} gc={gold} />}
      {sub && <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p>}
      {dynamic && status?.kind === "classified" && (
        <ul className="mt-3 space-y-1">
          {status.checks.filter((c) => c.passed !== null).map((c) => (
            <li key={c.key} className="flex justify-between gap-2 text-[10px] text-muted-foreground">
              <span className="min-w-0">{c.passed ? "✓" : "·"} {c.reason}</span>
              <span className="shrink-0 uppercase tracking-wider">{c.source}</span>
            </li>
          ))}
        </ul>
      )}
      {dynamic && (
        <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          {status?.kind === "classified" && status.phase === "live" ? "Live session read · NASDAQ · since 6:30 AM PT" : status?.kind === "classified" ? "Premarket read · NASDAQ · before 6:30 AM PT" : "Live classifier"}
        </p>
      )}
    </div>
  );
}
