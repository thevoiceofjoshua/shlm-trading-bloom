/**
 * Market context layer (server-only, read-only).
 * Session levels, 5M volatility, NY opening range and a 2-year yield read,
 * built from the same delayed 5-minute futures bars the Centre already uses.
 * Reuses Weekly Behavior's session-time and sweep helpers; changes nothing upstream.
 */
import { getJson } from "@/lib/quotes.server";
import { laShifted, detectSweep, type Bar } from "@/lib/weekly-behavior.server";

export type ContextSymbol = "NASDAQ" | "US30" | "XAU/USD";

export interface SessionLevel {
  label: string;
  price: number;
  side: "high" | "low";
  swept: boolean;
}

export type VolLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export interface InstrumentContext {
  price: number;
  levels: SessionLevel[];
  volatility: { level: VolLevel; ratio: number } | null;
  /** Liquidity sweep of the London range confirmed today. */
  sweep: "high" | "low" | null;
  openingRange:
    | { state: "pending" }
    | { state: "forming"; high: number; low: number }
    | { state: "set"; high: number; low: number; size: number; position: "above" | "below" | "inside" }
    | null;
  lastBarTs: number;
}

export interface MarketContext {
  instruments: Partial<Record<ContextSymbol, InstrumentContext>>;
  us02y: { direction: "up" | "down" | "flat"; reason: string } | null;
  /** True when the bars come from the delayed free feed. */
  delayed: true;
}

const FUTURES: Record<ContextSymbol, string> = { NASDAQ: "NQ=F", US30: "YM=F", "XAU/USD": "GC=F" };
const ASIA_END = 9 * 60; // 00:00 PT in shifted minutes
const LONDON_END = 14 * 60; // 05:00 PT
const NY_OPEN = 15 * 60 + 30; // 06:30 PT
const OR_END = NY_OPEN + 15; // first 15 minutes

const TTL = 45_000;
let cache: { at: number; value: MarketContext } | null = null;

async function bars5(symbol: string): Promise<Bar[]> {
  const json = await getJson(`/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=5d&includePrePost=true`);
  const r = json?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0] ?? {};
  const out: Bar[] = [];
  ts.forEach((t, i) => {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if ([o, h, l, c].some((x) => typeof x !== "number")) return;
    const { key, sm } = laShifted(t * 1000);
    out.push({ t, o, h, l, c, v: typeof q.volume?.[i] === "number" ? q.volume[i] : null, key, sm });
  });
  return out;
}

const hi = (b: Bar[]) => Math.max(...b.map((x) => x.h));
const lo = (b: Bar[]) => Math.min(...b.map((x) => x.l));
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function instrument(all: Bar[], todayKey: string, nowSm: number): InstrumentContext | null {
  const today = all.filter((b) => b.key === todayKey);
  if (!today.length) return null;
  const keys = [...new Set(all.map((b) => b.key))].filter((k) => k < todayKey).sort();
  const prevDay = keys.length ? all.filter((b) => b.key === keys[keys.length - 1]) : [];
  const priorBars = all.filter((b) => b.key < todayKey);
  const price = today[today.length - 1].c;

  const asia = today.filter((b) => b.sm < ASIA_END);
  const london = today.filter((b) => b.sm >= ASIA_END && b.sm < LONDON_END);
  const overnight = today.filter((b) => b.sm < NY_OPEN);
  const after = (from: number) => today.filter((b) => b.sm >= from);

  const levels: SessionLevel[] = [];
  const add = (label: string, bs: Bar[], laterFrom: number, minBars: number) => {
    if (bs.length < minBars) return;
    const H = hi(bs), L = lo(bs);
    const later = after(laterFrom);
    levels.push({ label: `${label} High`, price: H, side: "high", swept: later.some((b) => b.h > H) });
    levels.push({ label: `${label} Low`, price: L, side: "low", swept: later.some((b) => b.l < L) });
  };
  if (prevDay.length >= 60) add("Previous Day", prevDay, 0, 60);
  add("Asia", asia, ASIA_END, 6);
  if (nowSm >= LONDON_END) add("London", london, LONDON_END, 12);
  if (nowSm >= NY_OPEN) add("Overnight", overnight, NY_OPEN, 24);

  // Volatility: last 6 candles (30 min) vs the 5-day average 5M candle.
  const recent = today.slice(-6);
  const base = avg(priorBars.map((b) => b.h - b.l));
  let volatility: InstrumentContext["volatility"] = null;
  if (recent.length >= 6 && priorBars.length >= 120 && base > 0) {
    const ratio = avg(recent.map((b) => b.h - b.l)) / base;
    const level: VolLevel = ratio < 0.7 ? "LOW" : ratio < 1.3 ? "MEDIUM" : ratio < 2.2 ? "HIGH" : "EXTREME";
    volatility = { level, ratio: Math.round(ratio * 100) / 100 };
  }

  let sweep: InstrumentContext["sweep"] = null;
  if (nowSm >= LONDON_END && london.length >= 12) {
    const r = detectSweep(today, london, avg(today.map((b) => b.h - b.l)), 0.25, false);
    if (r.state === "confirmed") sweep = r.side;
  }

  let openingRange: InstrumentContext["openingRange"] = null;
  const orBars = today.filter((b) => b.sm >= NY_OPEN && b.sm < OR_END);
  if (nowSm < NY_OPEN) openingRange = { state: "pending" };
  else if (orBars.length) {
    const H = hi(orBars), L = lo(orBars);
    if (nowSm < OR_END || orBars.length < 3) openingRange = { state: "forming", high: H, low: L };
    else openingRange = { state: "set", high: H, low: L, size: H - L, position: price > H ? "above" : price < L ? "below" : "inside" };
  }

  return { price, levels, volatility, sweep, openingRange, lastBarTs: today[today.length - 1].t };
}

/** 2-year yield read from 2-year T-note futures (price moves opposite to yield). */
function us02y(all: Bar[], todayKey: string, nowSm: number): MarketContext["us02y"] {
  const today = all.filter((b) => b.key === todayKey);
  if (today.length < 12) return null;
  const last = today[today.length - 1].c;
  const london = today.filter((b) => b.sm >= ASIA_END && b.sm < LONDON_END);
  if (nowSm >= LONDON_END && london.length >= 12) {
    if (last < lo(london)) return { direction: "up", reason: "Breaking above its London range" };
    if (last > hi(london)) return { direction: "down", reason: "Breaking below its London range" };
    return { direction: "flat", reason: "Inside its London range" };
  }
  const first = today[0].o;
  if (last < first) return { direction: "up", reason: "Rising since the overnight open" };
  if (last > first) return { direction: "down", reason: "Easing since the overnight open" };
  return { direction: "flat", reason: "Flat since the overnight open" };
}

export async function computeMarketContext(now: Date = new Date()): Promise<MarketContext> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  const { key: todayKey, sm: nowSm } = laShifted(now.getTime());
  const syms = Object.keys(FUTURES) as ContextSymbol[];
  const [series, zt] = await Promise.all([
    Promise.all(syms.map((s) => bars5(FUTURES[s]).catch(() => [] as Bar[]))),
    bars5("ZT=F").catch(() => [] as Bar[]),
  ]);
  const instruments: MarketContext["instruments"] = {};
  syms.forEach((s, i) => {
    const r = instrument(series[i], todayKey, nowSm);
    if (r) instruments[s] = r;
  });
  const value: MarketContext = { instruments, us02y: us02y(zt, todayKey, nowSm), delayed: true };
  cache = { at: Date.now(), value };
  return value;
}
