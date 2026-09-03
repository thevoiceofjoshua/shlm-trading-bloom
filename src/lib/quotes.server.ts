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
  NASDAQ: "^IXIC",
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
  NASDAQ: "NASDAQ:IXIC",
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
      const prev = typeof meta?.['chartPreviousClose'] === "number" ? meta['chartPreviousClose'] : price;
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
