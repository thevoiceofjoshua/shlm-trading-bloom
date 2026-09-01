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
/** ---- Actuals overlay -------------------------------------------------
 * The FairEconomy weekly JSON never carries released values (only forecast /
 * previous), which is why printed numbers never showed up. We overlay the
 * released numbers from the public TradingView economic-calendar endpoint,
 * matched on release timestamp + title similarity.
 */

interface TvRow {
  title?: string;
  currency?: string;
  date?: string;
  actual?: number | null;
  forecast?: number | null;
  previous?: number | null;
  unit?: string | null;
  scale?: string | null;
  importance?: number;
}

function fmtTv(value: number | null | undefined, unit?: string | null, scale?: string | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return undefined;
  const num = Math.abs(value) >= 1000 ? value.toLocaleString("en-US") : String(value);
  const withScale = `${num}${scale ?? ""}`;
  if (unit === "%") return `${withScale}%`;
  if (unit === "$") return `$${withScale}`;
  return unit ? `${withScale} ${unit}` : withScale;
}

const STOP = new Set([
  "the", "of", "and", "index", "final", "prelim", "preliminary", "rate", "mm", "yy", "qq", "qy",
  "m", "y", "q", "flash", "adv", "advance", "revised", "core",
]);

function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  );
}

/** Map of "epochMs" -> released rows at that instant. */
async function fetchActuals(fromISO: string, toISO: string): Promise<Map<number, TvRow[]>> {
  const map = new Map<number, TvRow[]>();
  try {
    const url = `https://economic-calendar.tradingview.com/events?from=${fromISO}&to=${toISO}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
        Origin: "https://www.tradingview.com",
      },
    });
    if (!res.ok) return map;
    const json = (await res.json()) as { result?: TvRow[] };
    for (const row of json.result ?? []) {
      if (!row?.date || !row?.title) continue;
      const at = new Date(row.date).getTime();
      if (Number.isNaN(at)) continue;
      const list = map.get(at) ?? [];
      list.push(row);
      map.set(at, list);
    }
  } catch {
    /* overlay is best-effort */
  }
  return map;
}

/** Best title match among rows released at the same instant. */
function pickMatch(title: string, rows: TvRow[]): TvRow | undefined {
  const want = tokens(title);
  let best: TvRow | undefined;
  let bestScore = 0;
  for (const row of rows) {
    const have = tokens(row.title ?? "");
    let score = 0;
    for (const t of want) if (have.has(t)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  if (bestScore === 0) return rows.length === 1 ? rows[0] : undefined;
  return best;
}

/** Build the board straight from TradingView (used when the FF feed 429s). */
async function eventsFromTradingView(): Promise<EconEvent[]> {
  const now = Date.now();
  const from = new Date(now - 3 * 864e5).toISOString();
  const to = new Date(now + 5 * 864e5).toISOString();
  const slots = await fetchActuals(from, to);
  const out: EconEvent[] = [];
  for (const rows of slots.values()) {
    for (const row of rows) {
      const currency = row.currency ?? "";
      const importance = Number((row as { importance?: number }).importance ?? -1);
      const impact = importance >= 1 ? "high" : importance === 0 ? "medium" : "low";
      if (!currency || !row.title || !row.date) continue;
      if (currency !== "USD" && impact !== "high") continue;
      const when = laDateTime(row.date);
      if (!when) continue;
      out.push({
        time: when.time,
        date: when.date,
        title: row.title,
        impact,
        detail: `${impact === "high" ? "High-impact" : impact === "medium" ? "Medium-impact" : "Low-impact"} ${currency} release.`,
        currency,
        forecast: fmtTv(row.forecast, row.unit, row.scale),
        previous: fmtTv(row.previous, row.unit, row.scale),
        actual: fmtTv(row.actual, row.unit, row.scale),
        affects: affectsFor(row.title),
      });
    }
  }
  out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return out;
}

export async function fetchLiveEconEvents(): Promise<EconEvent[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.events;

  let rows: FeedRow[] = [];
  try {
    const res = await fetch(FEED, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (res.ok) rows = (await res.json()) as FeedRow[];
  } catch {
    rows = [];
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    // Schedule feed unavailable (rate limited): build the board from TradingView.
    const fallback = await eventsFromTradingView();
    if (fallback.length > 0) {
      cache = { at: Date.now(), events: fallback };
      return fallback;
    }
    return cache?.events ?? [];
  }

  const stamps = rows
    .map((r) => new Date(r?.date ?? "").getTime())
    .filter((n) => !Number.isNaN(n));
  const from = new Date(Math.min(...stamps) - 36e5).toISOString();
  const to = new Date(Math.max(...stamps) + 36e5).toISOString();
  const actuals = stamps.length > 0 ? await fetchActuals(from, to) : new Map<number, TvRow[]>();


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

    const at = new Date(row.date).getTime();
    const sameSlot = (actuals.get(at) ?? []).filter(
      (r) => !r.currency || !row.country || r.currency === row.country,
    );
    const match = pickMatch(row.title, sameSlot);

    events.push({
      time: when.time,
      date: when.date,
      title: row.title,
      impact: impactRaw === "high" ? "high" : impactRaw === "medium" ? "medium" : "low",
      detail: detailFor(row),
      currency: row.country,
      forecast: clean(row.forecast) ?? fmtTv(match?.forecast, match?.unit, match?.scale),
      previous: clean(row.previous) ?? fmtTv(match?.previous, match?.unit, match?.scale),
      actual: clean(row.actual) ?? fmtTv(match?.actual, match?.unit, match?.scale),
      affects: affectsFor(row.title),
    });
  }

  events.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if (events.length === 0) return cache?.events ?? [];

  cache = { at: Date.now(), events };
  return events;
}

