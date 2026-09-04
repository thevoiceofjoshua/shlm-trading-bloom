/**
 * Free delayed market feed (server-only).
 *
 * Uses Yahoo Finance's public endpoints: one batched "spark" request for every
 * symbol (prices + prior close) plus a small number of chart requests to get
 * day high/low for the headline instruments. Prices are delayed (roughly
 * 10–20 minutes) and the source rate-limits bursts, so results are cached and
 * every request is wrapped in try/catch — when the feed is unreachable the
 * caller keeps the typed sample dataset instead of breaking the Centre.
 */

export interface FeedLevel {
  label: string;
  price: number;
  side: "high" | "low";
  swept: boolean;
}

export interface FeedStructure {
  bias: "bullish" | "bearish" | "ranging";
  /** Last confirmed structure shift on the 1H. */
  event?: "BOS" | "CHoCH";
  /** Latest swing sequence read, e.g. "HH / HL". */
  sequence?: string;
  target?: FeedLevel;
  invalidation?: FeedLevel;
}

export interface DelayedQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  /** Prior session's true high / low (only when the feed provides daily bars). */
  priorDayHigh?: number;
  priorDayLow?: number;
  /** Pre-market extremes for today (only when pre-session bars exist). */
  premarketHigh?: number;
  premarketLow?: number;
  /** 1H structure read: direction, main target, invalidation. */
  h1?: FeedStructure;
  /** 5m swing points sitting between price and the 1H target. */
  pullbacks?: FeedLevel[];
  /** ISO timestamp of the daily 5:00am PST run that locked the levels in. */
  levelsSetAt?: string;
}


interface Bar {
  high: number;
  low: number;
}

/** Fractal swing detection: bar i is a swing when it dominates ±k neighbours. */
function swings(bars: Bar[], k = 2) {
  const highs: { i: number; price: number }[] = [];
  const lows: { i: number; price: number }[] = [];
  for (let i = k; i < bars.length - k; i += 1) {
    const b = bars[i]!;
    let isHigh = true;
    let isLow = true;
    for (let j = i - k; j <= i + k; j += 1) {
      if (j === i) continue;
      const n = bars[j]!;
      if (n.high >= b.high) isHigh = false;
      if (n.low <= b.low) isLow = false;
    }
    if (isHigh) highs.push({ i, price: b.high });
    if (isLow) lows.push({ i, price: b.low });
  }
  return { highs, lows };
}

function toBars(raw: unknown): Bar[] {
  const q = raw as { high?: (number | null)[]; low?: (number | null)[] } | undefined;
  const hs = q?.high ?? [];
  const ls = q?.low ?? [];
  const out: Bar[] = [];
  for (let i = 0; i < hs.length; i += 1) {
    const h = hs[i];
    const l = ls[i];
    if (typeof h === "number" && typeof l === "number" && Number.isFinite(h) && Number.isFinite(l)) {
      out.push({ high: h, low: l });
    }
  }
  return out;
}


/** Yahoo symbol for each instrument shown in the Centre. */
export const YAHOO_SYMBOLS: Record<string, string> = {
  NASDAQ: "^NDX",
  US30: "^DJI",
  "XAU/USD": "GC=F",
  AAPL: "AAPL",
  MSFT: "MSFT",
  NVDA: "NVDA",
  AMZN: "AMZN",
  GOOGL: "GOOGL",
  META: "META",
  TSLA: "TSLA",
  UNH: "UNH",
  GS: "GS",
  HD: "HD",
  CAT: "CAT",
  MCD: "MCD",
  V: "V",
  AMGN: "AMGN",
  CRM: "CRM",
  TRV: "TRV",
  TNX: "^TNX",
  DXY: "DX-Y.NYB",
  WTI: "CL=F",
};

/** Instruments that show day high / low, so they get a detail request. */
const DETAILED = ["NASDAQ", "US30", "XAU/USD"];

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
const UA = "Mozilla/5.0";

const TTL_MS = 45_000;
let cache: { at: number; quotes: Record<string, DelayedQuote> } | null = null;

function round(n: number, dp = 2) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

async function getJson(path: string): Promise<any | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        headers: { "User-Agent": UA, Accept: "*/*", "Accept-Language": "en-US,en;q=0.9" },
      });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // try the next host
    }
  }
  return null;
}

/** TradingView symbols used as a fallback for the headline instruments. */
const TV_SYMBOLS: Record<string, string> = {
  NASDAQ: "NASDAQ:NDX",
  US30: "DJ:DJI",
  "XAU/USD": "OANDA:XAUUSD",
};

async function getJsonAbsolute(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function build(key: string, price: number, prev: number, high?: number, low?: number): DelayedQuote {
  const base = prev || price;
  return {
    symbol: key,
    price: round(price, 2),
    change: round(price - base, 2),
    changePct: round(base ? ((price - base) / base) * 100 : 0, 2),
    dayHigh: round(high ?? Math.max(price, base), 2),
    dayLow: round(low ?? Math.min(price, base), 2),
    previousClose: round(base, 2),
  };
}

function mkLevel(
  label: string,
  price: number,
  side: "high" | "low",
  dayHigh: number,
  dayLow: number,
): FeedLevel {
  return {
    label,
    price: round(price, 2),
    side,
    swept: side === "high" ? dayHigh >= price : dayLow <= price,
  };
}

/** 1H read: HH/HL = bullish, LH/LL = bearish, otherwise ranging. */
function structureFrom(bars: Bar[], price: number, dayHigh: number, dayLow: number): FeedStructure | undefined {
  if (bars.length < 12) return undefined;
  const { highs, lows } = swings(bars, 2);
  if (highs.length < 2 || lows.length < 2) return undefined;

  const h1 = highs[highs.length - 1]!.price;
  const h0 = highs[highs.length - 2]!.price;
  const l1 = lows[lows.length - 1]!.price;
  const l0 = lows[lows.length - 2]!.price;

  let bias: FeedStructure["bias"] = "ranging";
  if (h1 > h0 && l1 > l0) bias = "bullish";
  else if (h1 < h0 && l1 < l0) bias = "bearish";

  const sequence = `${h1 > h0 ? "HH" : "LH"} / ${l1 > l0 ? "HL" : "LL"}`;

  // Prior leg's bias: a flip means the last shift was a CHoCH, otherwise a BOS.
  let event: FeedStructure["event"] | undefined;
  if (highs.length >= 3 && lows.length >= 3) {
    const hPrev = highs[highs.length - 3]!.price;
    const lPrev = lows[lows.length - 3]!.price;
    const prevBias = h0 > hPrev && l0 > lPrev ? "bullish" : h0 < hPrev && l0 < lPrev ? "bearish" : "ranging";
    if (bias !== "ranging") event = prevBias !== "ranging" && prevBias !== bias ? "CHoCH" : "BOS";
  }

  const above = highs.map((s) => s.price).filter((p) => p > price).sort((a, b) => a - b);
  const below = lows.map((s) => s.price).filter((p) => p < price).sort((a, b) => b - a);

  const targetPrice = bias === "bearish" ? below[0] : above[0];
  const invalidPrice = bias === "bearish" ? above[0] : below[0];
  const targetSide: "high" | "low" = bias === "bearish" ? "low" : "high";

  return {
    bias,
    event,
    sequence,
    target:
      typeof targetPrice === "number"
        ? mkLevel(targetSide === "high" ? "1H swing high" : "1H swing low", targetPrice, targetSide, dayHigh, dayLow)
        : undefined,
    invalidation:
      typeof invalidPrice === "number"
        ? mkLevel(
            targetSide === "high" ? "1H swing low" : "1H swing high",
            invalidPrice,
            targetSide === "high" ? "low" : "high",
            dayHigh,
            dayLow,
          )
        : undefined,
  };
}

/** 5m swing points between price and the 1H target — the pullback shelf. */
function pullbacksFrom(
  bars: Bar[],
  price: number,
  target: FeedLevel | undefined,
  dayHigh: number,
  dayLow: number,
): FeedLevel[] {
  if (bars.length < 12 || !target) return [];
  const { highs, lows } = swings(bars, 2);
  const targetAbove = target.price > price;
  const candidates = targetAbove
    ? lows.map((s) => s.price).filter((p) => p < price)
    : highs.map((s) => s.price).filter((p) => p > price && p < target.price + Math.abs(target.price - price) * 2);
  const sorted = targetAbove ? candidates.sort((a, b) => b - a) : candidates.sort((a, b) => a - b);
  const seen: number[] = [];
  const out: FeedLevel[] = [];
  for (const p of sorted) {
    if (seen.some((s) => Math.abs(s - p) / price < 0.0004)) continue;
    seen.push(p);
    out.push(mkLevel(targetAbove ? "5m swing low" : "5m swing high", p, targetAbove ? "low" : "high", dayHigh, dayLow));
    if (out.length === 2) break;
  }
  return out;
}

/* ------------------- Daily level lock (5:00am PST, Mon–Fri) ----------------- */

const LA_TZ = "America/Los_Angeles";
/** Levels for a trading day are set by the first run at/after this LA hour. */
const LEVELS_HOUR = 5;

interface StoredLevels {
  h1?: FeedStructure;
  pullbacks?: FeedLevel[];
}

/**
 * The trading day whose 5:00am PST run owns the levels currently on screen.
 * Before 5:00am we still show the previous day's, and weekends hold Friday's.
 */
export function levelsSessionDate(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: LA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  let anchor = Date.UTC(get("year"), get("month") - 1, get("day"));
  if (get("hour") % 24 < LEVELS_HOUR) anchor -= 86_400_000;
  // Weekends roll back to Friday.
  while ([0, 6].includes(new Date(anchor).getUTCDay())) anchor -= 86_400_000;
  return new Date(anchor).toISOString().slice(0, 10);
}

/** Re-stamp SWEPT against today's live range so tapped levels retire instantly. */
function applySwept(levels: StoredLevels, dayHigh: number, dayLow: number): StoredLevels {
  const mark = (l?: FeedLevel): FeedLevel | undefined =>
    l ? { ...l, swept: l.side === "high" ? dayHigh >= l.price : dayLow <= l.price } : undefined;
  return {
    h1: levels.h1
      ? { ...levels.h1, target: mark(levels.h1.target), invalidation: mark(levels.h1.invalidation) }
      : undefined,
    pullbacks: (levels.pullbacks ?? []).map((l) => mark(l)!).filter(Boolean),
  };
}

async function readStoredLevels(
  instrument: string,
  day: string,
): Promise<{ levels: StoredLevels; computedAt: string } | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("daily_levels")
      .select("levels, computed_at")
      .eq("instrument", instrument)
      .eq("session_date", day)
      .maybeSingle();
    if (!data?.levels) return null;
    return { levels: data.levels as StoredLevels, computedAt: String(data.computed_at) };
  } catch {
    return null;
  }
}

async function writeStoredLevels(
  instrument: string,
  day: string,
  levels: StoredLevels,
  overwrite = false,
): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const computedAt = new Date().toISOString();
    await (supabaseAdmin as any)
      .from("daily_levels")
      .upsert(
        { instrument, session_date: day, levels, computed_at: computedAt },
        { onConflict: "instrument,session_date", ignoreDuplicates: !overwrite },
      );
    return computedAt;
  } catch {
    return null;
  }
}

/**
 * Levels are computed once per trading day and then held: prices keep ticking,
 * but the 1H structure and 5m entry zones stay put until the next 5:00am PST.
 *
 * One exception: a stored day whose 5m entry zones came out empty (the intraday
 * series isn't there yet right after the 5:00am lock) is treated as incomplete
 * and backfilled the first time real pullbacks exist, so the execution block
 * never sits blank for the whole session.
 */
async function dailyLevels(instrument: string, fresh: StoredLevels, dayHigh: number, dayLow: number) {
  const day = levelsSessionDate();
  const stored = await readStoredLevels(instrument, day);
  const freshHasZones = (fresh.pullbacks ?? []).length > 0;

  if (stored) {
    const storedHasZones = (stored.levels.pullbacks ?? []).length > 0;
    if (storedHasZones || !freshHasZones) {
      return { ...applySwept(stored.levels, dayHigh, dayLow), levelsSetAt: stored.computedAt };
    }
    // Keep the locked 1H read, fill in the missing entry zones.
    const merged: StoredLevels = { h1: stored.levels.h1 ?? fresh.h1, pullbacks: fresh.pullbacks };
    await writeStoredLevels(instrument, day, merged, true);
    return { ...applySwept(merged, dayHigh, dayLow), levelsSetAt: stored.computedAt };
  }

  // Don't lock a day in on an empty shelf — wait until zones exist.
  if (!freshHasZones) return { ...fresh, levelsSetAt: undefined };
  const computedAt = await writeStoredLevels(instrument, day, fresh);
  return { ...fresh, levelsSetAt: computedAt ?? undefined };
}



/**
 * Fetch every mapped instrument. Returns whatever succeeded (or the last cached
 * value); an empty object means the feed is unreachable.
 */
export async function fetchDelayedQuotes(): Promise<Record<string, DelayedQuote>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.quotes;

  const pairs = Object.entries(YAHOO_SYMBOLS);
  const out: Record<string, DelayedQuote> = { ...(cache?.quotes ?? {}) };

  // 1) Batched requests (the feed caps each call at 20 symbols).
  const chunks: [string, string][][] = [];
  for (let i = 0; i < pairs.length; i += 10) chunks.push(pairs.slice(i, i + 10));
  for (const chunk of chunks) {
    const symbols = chunk.map(([, sym]) => sym).join(",");
    const spark = await getJson(`/v8/finance/spark?symbols=${encodeURIComponent(symbols)}&interval=1d&range=1d`);
    if (!spark || typeof spark !== "object") continue;
    for (const [key, sym] of chunk) {
      const row = spark[sym];
      const price = Array.isArray(row?.close) ? Number(row.close[row.close.length - 1]) : NaN;
      const prev = Number(row?.chartPreviousClose ?? row?.previousClose ?? NaN);
      if (Number.isFinite(price) && price > 0) out[key] = build(key, price, Number.isFinite(prev) ? prev : price);
    }
  }

  // 2) Headline instruments also need session high / low plus real key levels:
  //    the prior session's own high / low and today's pre-market extremes.
  await Promise.all(
    DETAILED.map(async (key) => {
      const sym = YAHOO_SYMBOLS[key];
      if (!sym) return;
      const json = await getJson(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`);
      const result = json?.chart?.result?.[0];
      const meta = result?.meta as Record<string, number> | undefined;
      const price = meta?.['regularMarketPrice'];
      if (typeof price !== "number") return;
      // Prior close must come from the daily bars: with a multi-day range the
      // feed's chartPreviousClose is the close before the whole window.
      const dailyCloses = ((result?.indicators?.quote?.[0]?.close ?? []) as (number | null)[]).filter(
        (n): n is number => typeof n === "number" && Number.isFinite(n),
      );
      const prev =
        dailyCloses.length >= 2
          ? dailyCloses[dailyCloses.length - 2]!
          : typeof meta?.['chartPreviousClose'] === "number"
            ? meta['chartPreviousClose']
            : price;
      const quote = build(key, price, prev, meta?.['regularMarketDayHigh'], meta?.['regularMarketDayLow']);

      // Prior daily bar = the most recent completed session before today's.
      const bars = result?.indicators?.quote?.[0] as { high?: (number | null)[]; low?: (number | null)[] } | undefined;
      const highs = (bars?.high ?? []).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
      const lows = (bars?.low ?? []).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
      if (highs.length >= 2 && lows.length >= 2) {
        quote.priorDayHigh = round(highs[highs.length - 2]!, 2);
        quote.priorDayLow = round(lows[lows.length - 2]!, 2);
      }

      // Pre-market window from the intraday feed (absent for cash indices).
      const pre = await getJson(
        `/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=1d&includePrePost=true`,
      );
      const preRes = pre?.chart?.result?.[0];
      const period = preRes?.meta?.currentTradingPeriod?.pre as { start?: number; end?: number } | undefined;
      const stamps: number[] = Array.isArray(preRes?.timestamp) ? preRes.timestamp : [];
      const preBars = preRes?.indicators?.quote?.[0] as { high?: (number | null)[]; low?: (number | null)[] } | undefined;
      if (period?.start && period?.end && stamps.length > 0 && preBars) {
        const pHigh: number[] = [];
        const pLow: number[] = [];
        stamps.forEach((t, i) => {
          if (t < period.start! || t >= period.end!) return;
          const h = preBars.high?.[i];
          const l = preBars.low?.[i];
          if (typeof h === "number" && Number.isFinite(h)) pHigh.push(h);
          if (typeof l === "number" && Number.isFinite(l)) pLow.push(l);
        });
        if (pHigh.length > 0 && pLow.length > 0) {
          quote.premarketHigh = round(Math.max(...pHigh), 2);
          quote.premarketLow = round(Math.min(...pLow), 2);
        }
      }

      // 1H structure (direction + main target) and the 5m pullback shelf.
      // Computed fresh, then locked to the day's 5:00am PST snapshot.
      const h1json = await getJson(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=60m&range=1mo`);
      const h1bars = toBars(h1json?.chart?.result?.[0]?.indicators?.quote?.[0]);
      const structure = structureFrom(h1bars, quote.price, quote.dayHigh, quote.dayLow);
      if (structure) {
        let m5bars = toBars(preBars);
        // Right after the 5:00am lock today's 5m series is often too short
        // (or missing for cash indices) — widen the window so the entry zones
        // still have swings to work with.
        if (m5bars.length < 12) {
          const wide = await getJson(
            `/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=5d&includePrePost=true`,
          );
          const wideBars = toBars(wide?.chart?.result?.[0]?.indicators?.quote?.[0]);
          if (wideBars.length > m5bars.length) m5bars = wideBars;
        }
        // Last resort: fall back to 15m swings so the shelf is never empty.
        let zones = pullbacksFrom(m5bars, quote.price, structure.target, quote.dayHigh, quote.dayLow);
        if (zones.length === 0) {
          const m15 = await getJson(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=15m&range=5d`);
          const m15bars = toBars(m15?.chart?.result?.[0]?.indicators?.quote?.[0]);
          zones = pullbacksFrom(m15bars, quote.price, structure.target, quote.dayHigh, quote.dayLow);
        }
        const fresh = { h1: structure, pullbacks: zones };

        const locked = await dailyLevels(key, fresh, quote.dayHigh, quote.dayLow);
        quote.h1 = locked.h1;
        quote.pullbacks = locked.pullbacks;
        quote.levelsSetAt = locked.levelsSetAt;
      }


      out[key] = quote;

    }),
  );

  // 3) Fallback source for the headline instruments if Yahoo is unavailable.
  await Promise.all(
    DETAILED.filter((k) => !out[k]).map(async (key) => {
      const tv = TV_SYMBOLS[key];
      if (!tv) return;
      const json = await getJsonAbsolute(
        `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(tv)}&fields=close,change,high,low,prev_close_price&no_404=true`,
      );
      const price = Number(json?.close);
      if (!Number.isFinite(price) || price <= 0) return;
      const changePct = Number(json?.change);
      const prev = Number.isFinite(Number(json?.prev_close_price))
        ? Number(json.prev_close_price)
        : Number.isFinite(changePct)
          ? price / (1 + changePct / 100)
          : price;
      out[key] = build(key, price, prev, Number(json?.high) || undefined, Number(json?.low) || undefined);
    }),
  );

  if (Object.keys(out).length > 0) cache = { at: Date.now(), quotes: out };
  return out;
}
