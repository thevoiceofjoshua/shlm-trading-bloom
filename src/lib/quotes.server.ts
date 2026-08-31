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

export interface DelayedQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
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

  // 2) Headline instruments also need the session high / low.
  await Promise.all(
    DETAILED.map(async (key) => {
      const sym = YAHOO_SYMBOLS[key];
      if (!sym) return;
      const json = await getJson(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`);
      const meta = json?.chart?.result?.[0]?.meta as Record<string, number> | undefined;
      const price = meta?.['regularMarketPrice'];
      if (typeof price !== "number") return;
      const prev = typeof meta?.['chartPreviousClose'] === "number" ? meta['chartPreviousClose'] : price;
      out[key] = build(key, price, prev, meta?.['regularMarketDayHigh'], meta?.['regularMarketDayLow']);
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
