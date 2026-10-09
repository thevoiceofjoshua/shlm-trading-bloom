// Loads daily NQ=F / YM=F history into Seasonality tables (service role only).
// Characters are ESTIMATED from range/volume unless a real Day Character label exists.
import { estimateCharacters, type DailyBar } from "@/lib/seasonality-estimate";

const SYMBOLS = { NQ: "NQ=F", YM: "YM=F" } as const;
type Sym = keyof typeof SYMBOLS;
const REAL = new Set(["range bound", "slow", "choppy", "fast"]);

const nyDate = (ts: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts * 1000));

async function fetchDaily(ticker: string, period1: number): Promise<DailyBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&period1=${period1}&period2=${Math.floor(Date.now() / 1000)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Daily history ${ticker} HTTP ${res.status}`);
  const r = (await res.json())?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0] ?? {};
  const out = new Map<string, DailyBar>();
  ts.forEach((t, i) => {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
    if (![o, h, l, c].every((x) => typeof x === "number" && x > 0)) return;
    const date = nyDate(t);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (dow === 0 || dow === 6) return; // Monday–Friday sessions only
    out.set(date, { date, open: o, high: Math.max(h, o, c, l), low: Math.min(l, o, c, h), close: c, volume: typeof v === "number" && v >= 0 ? v : 0 });
  });
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Real labels saved by the Day Character read (weekly_behavior_state), final reads only. */
async function realLabels(admin: any): Promise<Record<Sym, Map<string, string>>> {
  const res = { NQ: new Map<string, string>(), YM: new Map<string, string>() };
  const { data } = await admin.from("weekly_behavior_state").select("session_date, reading");
  for (const row of data ?? []) {
    const r = row.reading ?? {};
    const nq = String(r.label ?? "").toLowerCase(), ym = String(r.us30_label ?? "").toLowerCase();
    if (REAL.has(nq) && r.developing !== true) res.NQ.set(row.session_date, nq);
    if (REAL.has(ym) && r.us30_developing !== true) res.YM.set(row.session_date, ym);
  }
  return res;
}

export async function syncSeasonality(opts: { years: number }) {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const labels = await realLabels(admin);
  const today = nyDate(Date.now() / 1000);
  const summary: Record<string, { rows: number; start: string | null; end: string | null }> = {};
  for (const sym of Object.keys(SYMBOLS) as Sym[]) {
    // Extra 60 days so the first kept day already has a trailing average.
    const period1 = Math.floor(Date.now() / 1000 - (opts.years * 365.25 + 60) * 86400);
    const bars = await fetchDaily(SYMBOLS[sym], period1);
    const est = estimateCharacters(bars);
    const keep = est.filter((d) => d.character);
    if (!keep.length) { summary[sym] = { rows: 0, start: null, end: null }; continue; }
    // Preserve real labels already stored.
    const existing = new Map<string, string>();
    for (let off = 0; ; off += 1000) {
      const r = await admin.from("seasonality_history").select("date, character").eq("symbol", sym).eq("estimated", false).gte("date", keep[0].date).range(off, off + 999);
      if (r.error) throw r.error;
      (r.data ?? []).forEach((x: any) => existing.set(x.date, x.character));
      if ((r.data?.length ?? 0) < 1000) break;
    }
    const rows = keep.map((d) => {
      const real = labels[sym].get(d.date) ?? existing.get(d.date);
      return { symbol: sym, date: d.date, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume,
        character: real ?? d.character!, estimated: !real,
        source: real ? `Yahoo Finance daily ${SYMBOLS[sym]} · Day Character read` : `Yahoo Finance daily ${SYMBOLS[sym]} · estimated character` };
    });
    for (let i = 0; i < rows.length; i += 500) {
      const r = await admin.from("seasonality_history").upsert(rows.slice(i, i + 500), { onConflict: "symbol,date" });
      if (r.error) throw r.error;
    }
    // Month coverage: a month is complete once it has ended and history started before it.
    const firstMonth = rows[0].date.slice(0, 7), thisMonth = today.slice(0, 7);
    const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))];
    const cov = months.map((m) => ({ symbol: sym, year: Number(m.slice(0, 4)), month: Number(m.slice(5, 7)),
      complete: m > firstMonth && m < thisMonth, source: `Yahoo Finance daily ${SYMBOLS[sym]}` }));
    const c = await admin.from("seasonality_month_coverage").upsert(cov, { onConflict: "symbol,year,month" });
    if (c.error) throw c.error;
    summary[sym] = { rows: rows.length, start: rows[0].date, end: rows.at(-1)!.date };
  }
  return summary;
}
