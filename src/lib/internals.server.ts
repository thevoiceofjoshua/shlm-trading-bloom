// Market Internals — separate confirmation layer. Reads the existing Direction /
// Structure read-only; never modifies it. Missing inputs are reported as
// unavailable, never estimated.
import type { FeedMtf } from "@/lib/quotes.server";

export type Bias = "bullish" | "neutral" | "bearish";
export type Participation = "confirming" | "mixed" | "diverging" | "unavailable";
export type Breakout = "confirmed" | "caution" | "not_confirmed" | "no_breakout" | "unavailable";

export interface InternalReading {
  key: "TICK" | "ADD" | "VOLD";
  available: boolean;
  bias?: Bias;
  value?: number;
  missingReason?: string;
}

export interface VixContext {
  available: boolean;
  value?: number;
  changePct?: number;
  note: string;
}

export interface InternalsRead {
  symbol: "NASDAQ" | "US30";
  readings: InternalReading[];
  vix: VixContext;
  participation: Participation;
  divergence?: "BEARISH INTERNAL DIVERGENCE" | "BULLISH INTERNAL DIVERGENCE";
  breakout: Breakout;
  note: string;
}

export interface InternalsPayload {
  sourceConnected: boolean;
  missing: string[];
  reads: InternalsRead[];
}

/** Five-minute series per internal. Populated only by a real NYSE internals source. */
type Series = Partial<Record<"TICK" | "ADD" | "VOLD", number[]>>;

// Symbol-specific thresholds. Dow gets wider neutral bands (30 names, price-weighted).
const THRESHOLDS = {
  NASDAQ: { TICK: 150, ADD: 500, VOLD: 150_000_000, weights: { TICK: 3, ADD: 2, VOLD: 1 } },
  US30: { TICK: 200, ADD: 700, VOLD: 200_000_000, weights: { TICK: 2, ADD: 2, VOLD: 2 } },
} as const;

function classify(key: "TICK" | "ADD" | "VOLD", series: number[], sym: "NASDAQ" | "US30"): { bias: Bias; value: number } {
  const t = THRESHOLDS[sym][key];
  const last = series[series.length - 1];
  let level: number;
  if (key === "TICK") {
    // Smooth: ~30 min average blended with latest so a single spike can't flip it.
    const win = series.slice(-6);
    level = (win.reduce((a, b) => a + b, 0) / win.length) * 0.75 + last * 0.25;
  } else {
    const prev = series[Math.max(0, series.length - 4)];
    const slope = last - prev;
    level = last + slope * 0.5;
  }
  const bias: Bias = level > t ? "bullish" : level < -t ? "bearish" : "neutral";
  return { bias, value: last };
}

async function fetchVix(): Promise<{ price: number; changePct: number } | null> {
  for (const host of ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"]) {
    try {
      const res = await fetch(`${host}/v8/finance/chart/%5EVIX?interval=5m&range=1d`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      const price = Number(meta?.regularMarketPrice);
      const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
      if (!Number.isFinite(price) || !Number.isFinite(prev) || prev === 0) continue;
      return { price, changePct: ((price - prev) / prev) * 100 };
    } catch {
      // next host
    }
  }
  return null;
}

/** No NYSE internals source is connected yet — returns empty so nothing is fabricated. */
async function fetchInternalsSeries(): Promise<Series> {
  return {};
}

function vixNote(vix: { price: number; changePct: number } | null, dir: FeedMtf["direction"] | undefined): VixContext {
  if (!vix) return { available: false, note: "VIX DATA UNAVAILABLE — volatility context missing." };
  const rising = vix.changePct > 0.5;
  const falling = vix.changePct < -0.5;
  let note = "VIX steady — no strong volatility signal either way.";
  if (dir === "bullish") note = rising ? "Caution: fear is rising into price strength." : falling ? "Calming volatility supports the move higher." : note;
  else if (dir === "bearish") note = rising ? "Rising VIX — risk-off backdrop fits the decline." : falling ? "VIX easing while price falls — selling may lack fear behind it." : note;
  else if (rising) note = "VIX rising with no clear direction — expect choppier conditions.";
  return { available: true, value: Math.round(vix.price * 100) / 100, changePct: Math.round(vix.changePct * 100) / 100, note };
}

function readFor(sym: "NASDAQ" | "US30", mtf: FeedMtf | undefined, series: Series, vix: VixContext): InternalsRead {
  const keys = ["TICK", "ADD", "VOLD"] as const;
  const readings: InternalReading[] = keys.map((key) => {
    const s = series[key];
    if (!s || s.length === 0) return { key, available: false, missingReason: `$${key} — no NYSE internals source connected` };
    return { key, available: true, ...classify(key, s, sym) };
  });
  const avail = readings.filter((r) => r.available);
  if (avail.length === 0) {
    return {
      symbol: sym, readings, vix, participation: "unavailable", breakout: "unavailable",
      note: "NYSE internals ($TICK, $ADD and $VOLD) aren't connected yet, so participation and breakout confirmation can't be judged.",
    };
  }
  const dir = mtf?.direction;
  const priceBias: Bias | null = dir === "bullish" || mtf?.m5 === "bullish" ? "bullish" : dir === "bearish" || mtf?.m5 === "bearish" ? "bearish" : null;
  const w = THRESHOLDS[sym].weights;
  let score = 0, total = 0;
  for (const r of avail) {
    const v = r.bias === "bullish" ? 1 : r.bias === "bearish" ? -1 : 0;
    score += v * w[r.key];
    total += w[r.key];
  }
  const net = score / total; // -1..1
  let participation: Participation = "mixed";
  let divergence: InternalsRead["divergence"];
  if (priceBias) {
    const aligned = priceBias === "bullish" ? net : -net;
    participation = aligned >= 0.5 ? "confirming" : aligned <= -0.34 ? "diverging" : "mixed";
    if (participation === "diverging") divergence = priceBias === "bullish" ? "BEARISH INTERNAL DIVERGENCE" : "BULLISH INTERNAL DIVERGENCE";
  }
  let breakout: Breakout = "no_breakout";
  if (mtf && mtf.bos !== "none" && mtf.m5 === mtf.bos) {
    breakout = participation === "confirming" ? "confirmed" : participation === "diverging" ? "not_confirmed" : "caution";
  }
  const partial = avail.length < 3 ? ` Missing: ${readings.filter((r) => !r.available).map((r) => `$${r.key}`).join(", ")}.` : "";
  const note = divergence
    ? `${divergence}: price is ${priceBias === "bullish" ? "moving higher" : "moving lower"} but broad participation isn't confirming. Warning context, not a trade signal.${partial}`
    : `Context only — not a trade signal.${partial}`;
  return { symbol: sym, readings, vix, participation, divergence, breakout, note };
}

export async function computeInternals(mtfBySymbol: Partial<Record<"NASDAQ" | "US30", FeedMtf>>): Promise<InternalsPayload> {
  const [series, vixRaw] = await Promise.all([fetchInternalsSeries(), fetchVix()]);
  const missing = (["TICK", "ADD", "VOLD"] as const).filter((k) => !series[k]?.length).map((k) => `$${k}`);
  if (!vixRaw) missing.push("VIX");
  const reads = (["NASDAQ", "US30"] as const).map((sym) =>
    readFor(sym, mtfBySymbol[sym], series, vixNote(vixRaw, mtfBySymbol[sym]?.direction)),
  );
  return { sourceConnected: missing.filter((m) => m !== "VIX").length < 3, missing, reads };
}
