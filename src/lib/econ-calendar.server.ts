/**
 * Live economic calendar (server-only).
 *
 * Source: the free FairEconomy weekly calendar JSON (the Forex Factory feed).
 * No API key required. Results are cached and every call is wrapped in
 * try/catch — when the feed is unreachable the caller keeps the typed sample
 * dataset so the Centre never breaks.
 */

import type { EconEvent } from "@/lib/market-data";
import { SITE_TIMEZONE } from "@/lib/time";

const FEED = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const TTL_MS = 10 * 60_000;

interface FeedRow {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast?: string;
  previous?: string;
  actual?: string;
}

let cache: { at: number; events: EconEvent[] } | null = null;

/** Split an instant into LA wall-clock date + HH:MM (the canonical Centre format). */
function laDateTime(iso: string): { date: string; time: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}

/** Instruments a release typically moves, inferred from its title. */
function affectsFor(title: string): string[] {
  const t = title.toLowerCase();
  if (/cpi|ppi|pce|inflation|fomc|fed|interest rate|powell/.test(t)) {
    return ["XAU/USD", "NASDAQ", "US30", "USD pairs"];
  }
  if (/payroll|employment|unemployment|jobless|jolts|adp/.test(t)) {
    return ["XAU/USD", "US30", "NASDAQ", "USD pairs"];
  }
  if (/retail sales|consumer|ism|pmi|gdp|durable|housing/.test(t)) {
    return ["US30", "NASDAQ"];
  }
  if (/crude|oil|inventories/.test(t)) return ["US30", "WTI"];
  return ["NASDAQ", "US30"];
}

function detailFor(row: FeedRow): string {
  const i = row.impact.toLowerCase();
  const impact = i === "high" ? "High-impact" : i === "medium" ? "Medium-impact" : "Low-impact";
  return `${impact} ${row.country} release.`;
}

function clean(v?: string): string | undefined {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : undefined;
}

/**
 * Returns this week's high/medium-impact releases in Centre format,
 * or an empty array when the feed cannot be read.
 */
export async function fetchLiveEconEvents(): Promise<EconEvent[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.events;

  let rows: FeedRow[] = [];
  try {
    const res = await fetch(FEED, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return cache?.events ?? [];
    rows = (await res.json()) as FeedRow[];
  } catch {
    return cache?.events ?? [];
  }
  if (!Array.isArray(rows)) return cache?.events ?? [];

  const events: EconEvent[] = [];
  for (const row of rows) {
    if (!row?.title || !row?.date) continue;
    const impactRaw = String(row.impact ?? "").toLowerCase();
    if (impactRaw !== "high" && impactRaw !== "medium" && impactRaw !== "low") continue;
    // Non-economic rows (holidays, "All" country chatter) never make the board.
    if (row.country === "All" || !row.country) continue;
    // US desk focus: every USD print, plus high-impact releases elsewhere.
    if (row.country !== "USD" && impactRaw !== "high") continue;

    const when = laDateTime(row.date);
    if (!when) continue;

    events.push({
      time: when.time,
      date: when.date,
      title: row.title,
      impact: impactRaw === "high" ? "high" : impactRaw === "medium" ? "medium" : "low",
      detail: detailFor(row),
      currency: row.country,
      forecast: clean(row.forecast),
      previous: clean(row.previous),
      actual: clean(row.actual),
      affects: affectsFor(row.title),
    });
  }

  events.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if (events.length === 0) return cache?.events ?? [];

  cache = { at: Date.now(), events };
  return events;
}
