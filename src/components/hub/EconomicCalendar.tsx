import { useState } from "react";
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

      {morningEvents.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {morningEvents.map((event) => (
            <article key={`${event.date}-${event.time}-${event.title}`} className="rounded-lg border border-foreground/30 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <time dateTime={`${event.date}T${event.time}`}>{econTimeToLocal(event.date, event.time)}</time>
                {event.currency && <span className="rounded-full border border-border px-2 py-0.5">{event.currency}</span>}
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
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">No high-impact morning releases.</p>
      )}
    </section>
  );
}

type EconRow = HubPayload["econEvents"][number];

type NewsTheme = {
  key: string;
  match: RegExp;
  nasdaq: string;
  dow: string;
};

const NEWS_THEMES: NewsTheme[] = [
  {
    key: "inflation",
    match: /cpi|inflation|ppi|pce/i,
    nasdaq: "an inflation print moves rate expectations first, and the NASDAQ is the most rate-sensitive of the two — a hot number usually hits tech hardest, a soft one fuels the sharpest bounce",
    dow: "the Dow reacts more slowly to inflation data, but a hot print still pressures it through higher borrowing costs for its industrial and financial names",
  },
  {
    key: "jobs",
    match: /payroll|nfp|unemployment|jobless|claims|employment/i,
    nasdaq: "jobs data cuts both ways for the NASDAQ — strong hiring means rates stay higher for longer, weak hiring revives cut hopes but raises growth fears",
    dow: "the Dow leans on the growth read: solid hiring supports its cyclical, consumer and industrial components, a sharp miss hits them directly",
  },
  {
    key: "fed",
    match: /fed|fomc|powell|rate decision|interest rate/i,
    nasdaq: "Fed commentary is the single biggest driver for the NASDAQ — hawkish language compresses tech valuations, dovish language expands them fast",
    dow: "the Dow follows the Fed through the economy rather than valuations: hawkish means tighter credit for banks and industrials, dovish eases that pressure",
  },
  {
    key: "growth",
    match: /gdp|ism|pmi|industrial production|durable/i,
    nasdaq: "growth data matters less to the NASDAQ than rates do, but a big miss pulls risk appetite out of the whole index",
    dow: "growth and manufacturing data hit the Dow hardest — its industrials and materials names trade directly off this read",
  },
  {
    key: "consumer",
    match: /retail sales|consumer|sentiment|confidence/i,
    nasdaq: "the consumer read feeds NASDAQ names through ad spend and discretionary tech demand",
    dow: "the Dow carries large consumer and retail weights, so this print tends to move it more than the NASDAQ",
  },
  {
    key: "oil",
    match: /oil|crude|inventor|opec/i,
    nasdaq: "energy prints are a second-order input for the NASDAQ, mainly via the inflation path",
    dow: "the Dow has direct energy and transport exposure, so this print can push it independently of tech",
  },
];

/** Plain-language read on how this morning's high-impact releases hit the two indexes. */
export function MorningNewsImpact({ payload }: { payload: HubPayload }) {
  const todayPacific = pacificDateISO();
  const events: EconRow[] = [...payload.econEvents]
    .filter((event) => event.date === todayPacific && event.impact === "high" && event.time < "12:00")
    .sort((a, b) => a.time.localeCompare(b.time));

  if (events.length === 0) return null;

  const themes: NewsTheme[] = [];
  for (const event of events) {
    const theme = NEWS_THEMES.find((t) => t.match.test(event.title));
    if (theme && !themes.some((t) => t.key === theme.key)) themes.push(theme);
  }

  const first = events[0]!;
  const timing = `${econTimeToLocal(first.date, first.time)}${events.length > 1 ? ` and ${events.length - 1} more before noon` : ""}`;
  const titles = events.map((e) => e.title).join(", ");

  const fallbackNasdaq =
    "expect wider spreads and faster reversals around the release — the NASDAQ typically reacts to the rate implications of the number, not the headline itself";
  const fallbackDow =
    "the Dow usually moves on what the number says about the economy, so it can lag or diverge from the NASDAQ's first reaction";

  return (
    <section aria-labelledby="morning-impact-title" className="border-b border-border py-6 sm:py-8">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">What it means this morning</p>
      <h3 id="morning-impact-title" className="mt-1 font-display text-lg font-semibold sm:text-2xl">
        How today&apos;s news hits NASDAQ and US30
      </h3>
      <p className="mt-3 text-sm text-muted-foreground">
        First release {timing}: {titles}.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="min-w-0 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">NASDAQ · MNQ</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed">
            {(themes.length ? themes.map((t) => t.nasdaq) : [fallbackNasdaq]).map((line) => (
              <li key={line} className="break-words">
                {line}.
              </li>
            ))}
          </ul>
        </article>
        <article className="min-w-0 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dow · US30 · MYM</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed">
            {(themes.length ? themes.map((t) => t.dow) : [fallbackDow]).map((line) => (
              <li key={line} className="break-words">
                {line}.
              </li>
            ))}
          </ul>
        </article>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Context only — not an entry signal. Wait for the release to settle before trading structure.
      </p>
    </section>
  );
}

export function EconomicCalendar({ payload }: { payload: HubPayload }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const events = [...payload.econEvents]
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
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

      <div className="mt-4 divide-y divide-border">
        {events.map((e, i) => {
          const localTime = econTimeToLocal(e.date, e.time);
          const dateLabel = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          const isOpen = open === i;
          const isLow = e.impact === "low";
          return (
            <div key={i}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className={`flex min-h-11 w-full flex-wrap items-center justify-between gap-2 py-2.5 text-left text-sm transition-colors hover:text-foreground ${
                  isLow ? "text-muted-foreground/70" : ""
                }`}
              >
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-medium tabular-nums">{localTime}</span>
                  <span className="text-muted-foreground">{dateLabel}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 break-words text-sm">{e.title}</span>
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
                  <div className="rounded-xl border border-border bg-surface p-4">
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

      {events.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No releases left this week.</p>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        {payload.econLive
          ? "Live calendar — USD + high-impact global releases, local time."
          : "Sample data — live feed unavailable."}
      </p>
    </div>
  );
}


/* ----------------------- Bias journal ----------------------- */
