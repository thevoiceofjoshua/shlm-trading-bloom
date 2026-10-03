/**
 * Pure summary helpers for the SHLM Centre. They only combine values already
 * in the hub payload — no fetching, no new indicators, no predictions.
 */
import type { HubPayload } from "@/lib/hub.functions";
import type { ContextSymbol, InstrumentContext, SessionLevel } from "@/lib/market-context.server";

export type Tone = "pos" | "neg" | "warn" | "info";
export type MarketStateLabel = "TRENDING" | "RANGING" | "EXPANDING" | "CONTRACTING" | "LIQUIDITY SWEEP" | "CONFLICTED";

type Mtf = NonNullable<HubPayload["indexes"][number]["mtf"]>;

export const INSTRUMENTS: { key: ContextSymbol; name: string }[] = [
  { key: "US30", name: "US30" },
  { key: "NASDAQ", name: "NAS100" },
  { key: "XAU/USD", name: "Gold" },
];

export function mtfOf(p: HubPayload, k: ContextSymbol): Mtf | undefined {
  return k === "XAU/USD" ? p.gold.mtf : p.indexes.find((i) => i.symbol === k)?.mtf;
}
export function ctxOf(p: HubPayload, k: ContextSymbol): InstrumentContext | undefined {
  return p.context?.instruments[k];
}

export function marketState(ctx?: InstrumentContext, mtf?: Mtf): { label: MarketStateLabel; why: string } | null {
  if (!ctx && !mtf) return null;
  if (ctx?.sweep) return { label: "LIQUIDITY SWEEP", why: `London ${ctx.sweep} swept and reversal confirmed` };
  if (mtf?.direction === "conflicted") return { label: "CONFLICTED", why: "Structure and drivers disagree" };
  const r = ctx?.volatility?.ratio;
  if (r != null && r >= 1.6) return { label: "EXPANDING", why: "Recent 5M candles well above average" };
  if (r != null && r <= 0.6) return { label: "CONTRACTING", why: "Recent 5M candles well below average" };
  if (mtf?.state === "trending") return { label: "TRENDING", why: "15M and 5M structure trending" };
  if (mtf) return { label: "RANGING", why: "No sustained structure break" };
  return null;
}

export function stateTone(l: MarketStateLabel): Tone {
  return l === "CONFLICTED" ? "neg" : l === "LIQUIDITY SWEEP" || l === "EXPANDING" ? "warn" : "info";
}

export function volTone(l: string): Tone {
  return l === "EXTREME" ? "neg" : l === "HIGH" ? "warn" : "info";
}

/* -------- Driver scores (same math the driver boards display) -------- */

export function equityScore(list: { changePct: number }[]): number | null {
  if (!list.length) return null;
  const up = list.filter((d) => d.changePct > 0).length;
  const down = list.filter((d) => d.changePct < 0).length;
  const a = list.reduce((s, d) => s + d.changePct, 0) / list.length;
  return Math.round(Math.max(-100, Math.min(100, ((up - down) / list.length) * 60 + Math.max(-40, Math.min(40, a * 25)))));
}
export function goldScore(list: { label: string; direction: "up" | "down" | "flat" }[]): number | null {
  if (!list.length) return null;
  let total = 0;
  for (const m of list) if (m.direction !== "flat") total += (m.direction === "up" ? 1 : -1) * (/vix|risk|stress/i.test(m.label) ? 1 : -1);
  return Math.round((total / list.length) * 100);
}
export function driverScore(p: HubPayload, k: ContextSymbol): number | null {
  return k === "NASDAQ" ? equityScore(p.magSeven) : k === "US30" ? equityScore(p.dowDrivers) : goldScore(p.goldDrivers);
}

export function driverAlignment(p: HubPayload, k: ContextSymbol): "Aligned" | "Conflicting" | "Mixed" | null {
  const s = driverScore(p, k);
  const d = mtfOf(p, k)?.direction;
  if (s == null || !d) return null;
  if (d === "conflicted") return "Conflicting";
  if (Math.abs(s) < 15 || d === "neutral") return "Mixed";
  return (s > 0) === (d === "bullish") ? "Aligned" : "Conflicting";
}

export function structureClarity(mtf?: Mtf): "Clear" | "Mixed" | "Conflicted" | null {
  if (!mtf) return null;
  return mtf.alignment === "strong" ? "Clear" : mtf.alignment === "conflicted" ? "Conflicted" : "Mixed";
}

/** Unswept levels split by side of price, nearest first. */
export function radar(ctx?: InstrumentContext) {
  if (!ctx) return null;
  const withDist = (l: SessionLevel) => ({ ...l, dist: Math.abs(l.price - ctx.price), pct: (Math.abs(l.price - ctx.price) / ctx.price) * 100 });
  const above = ctx.levels.filter((l) => l.price > ctx.price).map(withDist).sort((a, b) => a.dist - b.dist);
  const below = ctx.levels.filter((l) => l.price <= ctx.price).map(withDist).sort((a, b) => a.dist - b.dist);
  return { above, below };
}
/** "Near" = within 0.25% of price (about one session's typical push). */
export const NEAR_PCT = 0.25;

export function liquidityClarity(ctx?: InstrumentContext): "Clear" | "One-sided" | "Unclear" | null {
  const r = radar(ctx);
  if (!r) return null;
  const a = r.above.some((l) => !l.swept), b = r.below.some((l) => !l.swept);
  return a && b ? "Clear" : a || b ? "One-sided" : "Unclear";
}

export function nearestOpen(ctx?: InstrumentContext) {
  const r = radar(ctx);
  return { above: r?.above.find((l) => !l.swept) ?? null, below: r?.below.find((l) => !l.swept) ?? null };
}

export function laDateISO(now: Date = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return p;
}

export function nextMajorEvent(p: HubPayload) {
  const today = laDateISO();
  return [...p.econEvents]
    .filter((e) => e.date === today && e.impact === "high")
    .sort((a, b) => a.time.localeCompare(b.time))[0] ?? null;
}
