import { useState } from "react";
import { Activity, Clock3, Info } from "lucide-react";
import type { HubPayload } from "@/lib/hub.functions";
import { econTimeToLocal } from "@/lib/hub-session";
import { SESSIONS } from "@/lib/market-data";

/** Where a release lands relative to the SHLM trading windows (LA wall clock). */
function sessionContext(laTime: string): string {
  const [h, m] = laTime.split(":").map((v) => parseInt(v, 10));
  const mins = h * 60 + m;
  for (const s of SESSIONS) {
    const start = s.startH * 60 + s.startM;
    const end = s.endH * 60 + s.endM;
    const name = s.label.split("—")[0].trim();
    if (mins >= start && mins < end) return `Inside ${name}`;
    if (mins < start && start - mins <= 180) return `${start - mins} min before ${name}`;
  }
  return "Outside trading windows";
}

/** Only the instruments the Centre monitors, in short form. */
function relevantMarkets(affects?: string[]): string[] {
  const map: Record<string, string> = { NASDAQ: "NAS100", US30: "US30", "XAU/USD": "Gold" };
  return (affects ?? []).map((a) => map[a]).filter((a): a is string => !!a);
}

/** Forex Factory tier language: solid = high, outlined = medium, faint = low. */
const IMPACT_BADGE: Record<string, string> = {
  high: "bg-foreground text-background",
  medium: "border border-border text-foreground",
  low: "border border-border/50 text-muted-foreground/70",
};

function pacificDateISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function MorningNewsSpotlight({ payload }: { payload: HubPayload }) {
  const todayPacific = pacificDateISO();
  const morningEvents = [...payload.econEvents]
    .filter((event) => event.date === todayPacific && event.impact === "high" && event.time < "12:00")
    .sort((a, b) => a.time.localeCompare(b.time));

  const rows = morningEvents.map((event) => {
    const theme = NEWS_THEMES.find((item) => item.match.test(event.title)) ?? GENERIC;
    const timing = newsTiming(event.time);
    return { event, theme, timing };
  });
  const timingNotes = [...new Map(rows.map(({ timing }) => [timing.label, timing])).values()];

  return (
    <section aria-labelledby="morning-news-title" className="border-y border-border py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Today · before 12 PM Pacific</p>
          <h2 id="morning-news-title" className="mt-1 font-display text-xl font-semibold sm:text-3xl">
            Morning high-impact news
          </h2>
        </div>
        <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-background">
          High impact
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {rows.map(({ event, theme, timing }) => (
            <article key={`${event.date}-${event.time}-${event.title}`} className="rounded-lg border border-foreground/30 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <time dateTime={`${event.date}T${event.time}`}>{econTimeToLocal(event.date, event.time)}</time>
                {event.currency && <span className="rounded-full border border-border px-2 py-0.5">{event.currency}</span>}
                <span className="rounded-full border border-border px-2 py-0.5">{timing.label}</span>
              </div>
              <h3 className="mt-3 break-words font-display text-lg font-bold leading-tight sm:text-2xl">{event.title}</h3>
              {(event.forecast || event.previous) && (
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {event.forecast && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Forecast</dt>
                      <dd className="font-semibold tabular-nums">{event.forecast}</dd>
                    </div>
                  )}
                  {event.previous && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Previous</dt>
                      <dd className="font-semibold tabular-nums">{event.previous}</dd>
                    </div>
                  )}
                </dl>
              )}
              <div className="mt-4 grid gap-2">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-border bg-surface p-3">
                  <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">What it measures</p>
                    <p className="mt-1 text-sm leading-relaxed">{theme.what}</p>
                  </div>
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-foreground/20 bg-card p-3">
                  <Activity aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Likely response</p>
                    <p className="mt-1 text-sm leading-relaxed">{theme.likely}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">No high-impact morning releases.</p>
      )}

      {timingNotes.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="grid gap-3 lg:grid-cols-3">
            {timingNotes.map((timing) => (
              <div key={timing.label} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg bg-surface p-3">
                <Clock3 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{timing.label}</p>
                  <p className="mt-1 text-xs leading-relaxed">{timing.context}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Context only, not an entry signal. Let the first move settle before you trade.</p>
        </div>
      )}
    </section>
  );
}

type EconRow = HubPayload["econEvents"][number];

type NewsTheme = {
  key: string;
  match: RegExp;
  /** What the number is, in one beginner sentence. */
  what: string;
  /** Most likely scenario for both indexes. */
  likely: string;
};

const NEWS_THEMES: NewsTheme[] = [
  {
    key: "inflation",
    match: /cpi|inflation|ppi|pce/i,
    what: "This shows how fast prices are rising.",
    likely:
      "Higher than expected: both usually sell off, NASDAQ harder. Lower than expected: both usually rally, NASDAQ harder.",
  },
  {
    key: "jobs",
    match: /payroll|nfp|unemployment|jobless|claims|employment/i,
    what: "This shows how many people are working.",
    likely:
      "Much stronger than expected: first move is often down (rates stay high). Much weaker: both can drop on growth fears. Close to expected: both drift and range.",
  },
  {
    key: "fed",
    match: /fed|fomc|powell|rate decision|interest rate/i,
    what: "This is the Fed talking about interest rates.",
    likely:
      "Talk of keeping rates high: both sell off, NASDAQ most. Talk of cutting: both rally hard. Expect big whipsaws either way.",
  },
  {
    key: "growth",
    match: /gdp|ism|pmi|industrial production|durable/i,
    what: "This shows how much the economy is producing.",
    likely: "Stronger than expected: US30 usually leads up. Weaker: US30 usually leads down, NASDAQ follows.",
  },
  {
    key: "consumer",
    match: /retail sales|consumer|sentiment|confidence/i,
    what: "This shows how much people are spending.",
    likely: "Stronger spending: US30 usually gains most. Weaker spending: US30 drops first, NASDAQ follows.",
  },
  {
    key: "oil",
    match: /oil|crude|inventor|opec/i,
    what: "This is about the price of oil.",
    likely: "Oil jumping: US30 pressured. Oil falling: both usually get a small lift.",
  },
];

const GENERIC: NewsTheme = {
  key: "generic",
  match: /.^/,
  what: "This is a big scheduled number traders watch closely.",
  likely: "Expect one fast move on the release, then a pullback. Both indexes usually move the same direction.",
};

function newsTiming(time: string) {
  if (time < "06:30") {
    return {
      label: "Before the 6:30 open",
      context: "The first reaction can shape the direction and volatility carried into the opening candles. Watch whether it continues or reverses at the open.",
    };
  }
  if (time === "06:30") {
    return {
      label: "At the 6:30 open",
      context: "The release can trigger the first sharp move, widen volatility, or reverse the initial candle as the open begins.",
    };
  }
  return {
    label: "After the 6:30 open",
    context: "Price may position beforehand, then accelerate or reverse when the number lands during the opening sequence.",
  };
}

export function EconomicCalendar({ payload }: { payload: HubPayload }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const events = [...payload.econEvents]
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  // Group by calendar day — one bordered block per day.
  const groups: { date: string; events: { e: EconRow; idx: number }[] }[] = [];
  events.forEach((e, idx) => {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.events.push({ e, idx });
    else groups.push({ date: e.date, events: [{ e, idx }] });
  });

  const [open, setOpen] = useState<number | null>(null);

  // Next upcoming high-impact release — low rows stay background context.
  const next = events.find((e) => e.impact === "high" && e.date + e.time >= todayStr);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-medium">Economic calendar</h3>
        {next && (
          <span className="text-xs text-muted-foreground">
            Next: {next.title} — {econTimeToLocal(next.date, next.time)}
          </span>
        )}
      </div>

      {/* Heads up banner if a high-impact release lands in a trading window */}
      {events.some((e) => e.impact === "high" && e.date === todayStr) && (
        <div className="mt-3 rounded-lg border border-foreground/30 bg-surface px-4 py-2.5 text-xs text-foreground">
          ⚠ High-impact release today — watch your session timing.
        </div>
      )}

      {/* One bordered block per calendar day, newest-first as before. */}
      <div className="mt-4 space-y-3">
        {groups.map((group) => {
          const header = new Date(group.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          return (
            <section key={group.date} aria-label={header} className="rounded-xl border border-border bg-surface/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                <h4 className="font-display text-sm font-semibold uppercase tracking-widest">{header}</h4>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {group.date === todayStr ? "Today" : `${group.events.length} ${group.events.length === 1 ? "release" : "releases"}`}
                </span>
              </div>
              <div className="divide-y divide-border">
                {group.events.map(({ e, idx }) => {
                  const localTime = econTimeToLocal(e.date, e.time);
                  const isOpen = open === idx;
                  const isLow = e.impact === "low";
                  return (
                    <div key={idx}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : idx)}
                        className={`flex min-h-11 w-full flex-wrap items-center justify-between gap-2 py-2.5 text-left text-sm transition-colors hover:text-foreground ${
                          isLow ? "text-muted-foreground/70" : ""
                        }`}
                      >
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-medium tabular-nums">{localTime}</span>
                        </div>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 break-words text-sm">{e.title}</span>
                          {relevantMarkets(e.affects).length > 0 && (
                            <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
                              {relevantMarkets(e.affects).join(" · ")}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                              IMPACT_BADGE[e.impact] ?? IMPACT_BADGE.medium
                            }`}
                          >
                            {e.impact}
                          </span>
                          <span className={`text-xs text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="pb-4">
                          <div className="rounded-xl border border-border bg-card p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {e.currency && (
                                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                                  {e.currency}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{sessionContext(e.time)}</span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {[
                                { label: "Actual", value: e.actual },
                                { label: "Forecast", value: e.forecast },
                                { label: "Previous", value: e.previous },
                              ].map((f) => (
                                <div key={f.label} className="rounded-lg border border-border bg-card px-3 py-2">
                                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{f.label}</p>
                                  <p className="mt-0.5 font-display text-base tabular-nums">{f.value ?? "—"}</p>
                                </div>
                              ))}
                            </div>

                            {e.detail && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{e.detail}</p>}

                            {e.affects && e.affects.length > 0 && (
                              <div className="mt-3">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">What it moves</p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {e.affects.map((a) => (
                                    <span key={a} className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground">
                                      {a}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {events.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No releases left this week.</p>
      )}

      {payload.econLive && (
        <p className="mt-4 text-[11px] text-muted-foreground">
          Live calendar — USD + high-impact global releases, local time.
        </p>
      )}
    </div>
  );
}


/* ----------------------- Bias journal ----------------------- */
