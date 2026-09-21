/**
 * Client-side parser for Tradovate "Orders" CSV exports.
 *
 * Pure functions, no dependencies, no server involvement — used for prop firm
 * accounts that cannot use the live Tradovate API.
 */

export interface CsvTrade {
  instrument: string;
  direction: "long" | "short";
  result: "win" | "loss" | "breakeven";
  pnl: string;
  qty: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
}

export interface CsvParseResult {
  trades: CsvTrade[];
  skipped: number;
  openPositions: number;
  unknownSymbols: string[];
  error?: string;
}

/** Dollar value of one full point, keyed by contract root. */
const POINT_VALUE: Record<string, number> = {
  NQ: 20,
  MNQ: 2,
  ES: 50,
  MES: 5,
  YM: 5,
  MYM: 0.5,
  RTY: 50,
  M2K: 5,
  GC: 100,
  MGC: 10,
  SI: 5000,
  SIL: 1000,
  CL: 1000,
  MCL: 100,
  NG: 10000,
  QG: 2500,
  ZB: 1000,
  ZN: 1000,
  ZF: 1000,
  ZT: 2000,
  "6E": 125000,
  "6B": 62500,
  "6J": 12500000,
  "6A": 100000,
  "6C": 100000,
};

/** Strips the expiry suffix: "MNQZ5" -> "MNQ", "NQ 03-25" -> "NQ". */
export function contractRoot(symbol: string): string {
  const cleaned = symbol.trim().toUpperCase().split(/[\s._-]/)[0] ?? "";
  const match = cleaned.match(/^([A-Z0-9]*?[A-Z])[FGHJKMNQUVXZ]\d{1,2}$/);
  return match?.[1] ?? cleaned;
}

/** Splits one CSV line, honouring double-quoted fields. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.indexOf(normalizeHeader(candidate));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[()]/g, "");
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return value.includes("(") ? -n : n;
}

/** Tradovate exports timestamps like "09/19/2026 06:32:14" or ISO strings. */
function parseTime(value: string | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (us) {
    const [, m, d, y, h, min, s] = us;
    const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);
    const dt = new Date(year, Number(m) - 1, Number(d), Number(h), Number(min), Number(s ?? 0));
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  const parsed = new Date(raw.replace(" ", "T"));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

interface FilledOrder {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  time: string;
}

interface OpenLot {
  side: "buy" | "sell";
  qty: number;
  price: number;
  time: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Parses a Tradovate orders CSV export into round-trip trades. */
export function parseTradovateOrdersCsv(text: string): CsvParseResult {
  const empty: CsvParseResult = { trades: [], skipped: 0, openPositions: 0, unknownSymbols: [] };

  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { ...empty, error: "That file doesn't look like a Tradovate orders export." };
  }

  const headers = splitLine(lines[0]!);
  if (headers.length < 3) {
    return { ...empty, error: "That file doesn't look like a Tradovate orders export." };
  }

  const cols = {
    symbol: findColumn(headers, ["Symbol", "Contract", "Instrument"]),
    side: findColumn(headers, ["B/S", "Side", "Action", "BuySell"]),
    qty: findColumn(headers, ["Filled Qty", "Fill Qty", "Filled Quantity", "Qty", "Quantity"]),
    price: findColumn(headers, ["Avg Fill Price", "Fill Price", "Avg Price", "Price"]),
    time: findColumn(headers, ["Fill Time", "Filled Time", "Timestamp", "Time", "Date"]),
    status: findColumn(headers, ["Status", "Order Status"]),
  };

  const missing: string[] = [];
  if (cols.symbol === -1) missing.push("Symbol");
  if (cols.side === -1) missing.push("B/S");
  if (cols.qty === -1) missing.push("Filled Qty");
  if (cols.price === -1) missing.push("Avg Fill Price");
  if (cols.time === -1) missing.push("Fill Time");
  if (missing.length > 0) {
    return {
      ...empty,
      error: `This CSV is missing the ${missing.join(", ")} column${missing.length === 1 ? "" : "s"}. Export from Tradovate's Orders tab with fills included.`,
    };
  }

  const orders: FilledOrder[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = splitLine(line);
    const status = cols.status === -1 ? "" : (cells[cols.status] ?? "").toLowerCase();
    if (status && !status.includes("fill")) {
      skipped += 1;
      continue;
    }

    const symbol = (cells[cols.symbol] ?? "").trim();
    const sideRaw = (cells[cols.side] ?? "").trim().toLowerCase();
    const qty = parseNumber(cells[cols.qty]);
    const price = parseNumber(cells[cols.price]);
    const time = parseTime(cells[cols.time]);

    const side: "buy" | "sell" | null = sideRaw.startsWith("b")
      ? "buy"
      : sideRaw.startsWith("s")
        ? "sell"
        : null;

    if (!symbol || !side || !qty || qty <= 0 || price == null || !time) {
      skipped += 1;
      continue;
    }

    orders.push({ symbol, side, qty, price, time });
  }

  if (orders.length === 0) {
    return {
      ...empty,
      skipped,
      error: "No filled orders found in this file. Export from Tradovate's Orders tab with fills included.",
    };
  }

  orders.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

  const bySymbol = new Map<string, OpenLot[]>();
  const trades: CsvTrade[] = [];
  const unknown = new Set<string>();
  let openPositions = 0;

  for (const order of orders) {
    const root = contractRoot(order.symbol);
    const pointValue = POINT_VALUE[root];
    if (pointValue === undefined) unknown.add(root || order.symbol);
    const value = pointValue ?? 1;

    const lots = bySymbol.get(order.symbol) ?? [];
    let remaining = order.qty;

    while (remaining > 0 && lots.length > 0 && lots[0]!.side !== order.side) {
      const lot = lots[0]!;
      const matched = Math.min(remaining, lot.qty);
      const long = lot.side === "buy";
      const gross = (long ? order.price - lot.price : lot.price - order.price) * matched * value;
      const pnl = round2(gross);

      trades.push({
        instrument: order.symbol,
        direction: long ? "long" : "short",
        result: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
        pnl: String(pnl),
        qty: matched,
        entryPrice: lot.price,
        exitPrice: order.price,
        entryTime: lot.time,
        exitTime: order.time,
      });

      lot.qty -= matched;
      remaining -= matched;
      if (lot.qty <= 0) lots.shift();
    }

    if (remaining > 0) {
      lots.push({ side: order.side, qty: remaining, price: order.price, time: order.time });
    }
    bySymbol.set(order.symbol, lots);
  }

  for (const lots of bySymbol.values()) openPositions += lots.length;

  trades.sort((a, b) => Date.parse(a.entryTime) - Date.parse(b.entryTime));

  return { trades, skipped, openPositions, unknownSymbols: [...unknown] };
}
