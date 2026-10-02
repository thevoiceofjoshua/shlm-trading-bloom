/**
 * Weekly Behavior classifier (Monday / Friday: CHOPPY vs FAST).
 * Read-only context layer: reuses the existing quote feed helpers and the live
 * economic calendar. Never emits trade instructions.
 */
import { getJson, fetchDelayedQuotes } from "@/lib/quotes.server";
import { fetchLiveEconEvents } from "@/lib/econ-calendar.server";
import { SITE_TIMEZONE } from "@/lib/time";

export type CheckKey =
  | "overnight" | "london" | "volume" | "displacement" | "momentum" | "structure" | "catalyst" | "us02y";

export interface ClassifierCheck {
  key: CheckKey;
  label: string;
  weight: number;
  /** null = data unavailable, excluded from scoring. */
  passed: boolean | null;
  reason: string;
}

export type BehaviorLabel = "FAST" | "CHOPPY" | "SLOW" | "RANGE BOUND";

export type DayStatus =
  | { kind: "classified"; label: BehaviorLabel; developing: boolean; reason: string; score: number; checks: ClassifierCheck[] }
  | { kind: "waiting"; reason: string; checks: ClassifierCheck[] }
  | { kind: "not_today"; reason: string }
  | { kind: "closed"; reason: string };

export interface WeeklyBehaviorPayload {
  todayDow: number; // LA day of week (0=Sun)
  monday: DayStatus;
  friday: DayStatus;
  /** Rare caution note for Tue/Wed/Thu — only when the read is overwhelming. */
  fixedNote: { day: 2 | 3 | 4; label: BehaviorLabel; text: string } | null;
  computedAt: string;
}

interface Bar { t: number; o: number; h: number; l: number; c: number; v: number | null; key: string; sm: number }

const SHIFT_MIN = 9 * 60; // 15:00 PT prior day → 00:00 of the session key
const ASIA_END = 9 * 60; // 00:00 PT
const LONDON_END = 14 * 60; // 05:00 PT
const PRENY_END = 15 * 60 + 30; // 06:30 PT

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});
function laShifted(tsMs: number): { key: string; sm: number } {
  const p = fmt.formatToParts(new Date(tsMs + SHIFT_MIN * 60_000));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "0";
  return { key: `${g("year")}-${g("month")}-${g("day")}`, sm: (parseInt(g("hour"), 10) % 24) * 60 + parseInt(g("minute"), 10) };
}
function laDow(d: Date): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: SITE_TIMEZONE, weekday: "short" }).format(d);
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[w] ?? 0;
}

async function bars(symbol: string): Promise<Bar[]> {
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

const range = (b: Bar[]) => (b.length ? Math.max(...b.map((x) => x.h)) - Math.min(...b.map((x) => x.l)) : 0);
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function group(all: Bar[], todayKey: string) {
  const byKey = new Map<string, Bar[]>();
  for (const b of all) (byKey.get(b.key) ?? byKey.set(b.key, []).get(b.key)!).push(b);
  const today = byKey.get(todayKey) ?? [];
  const prior = [...byKey.entries()].filter(([k, v]) => k < todayKey && v.length >= 60).map(([, v]) => v);
  return { today, prior };
}

interface Level { name: string; price: number; side: "high" | "low"; from: number }

/** Breaks of a level that close back inside within 3 bars and don't continue in the next 6. */
function failedBreaks(bs: Bar[], levels: Level[]) {
  let count = 0;
  const hitLevels = new Set<string>();
  const perLevel = new Map<string, number>();
  for (const L of levels) {
    const out = (b: Bar) => (L.side === "high" ? b.h > L.price : b.l < L.price);
    const closedOut = (b: Bar) => (L.side === "high" ? b.c > L.price : b.c < L.price);
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      if (b.sm < L.from || !out(b)) continue;
      if (i > 0 && closedOut(bs[i - 1])) continue; // already outside, not a fresh break
      const back = bs.slice(i, i + 4).findIndex((x) => !closedOut(x));
      if (back === -1) continue;
      const after = bs.slice(i + back + 1, i + back + 7);
      if (after.length && after.some(closedOut)) continue; // had follow-through
      if (!after.length) continue; // too fresh to judge
      count++;
      hitLevels.add(L.name);
      perLevel.set(L.name + L.side, (perLevel.get(L.name + L.side) ?? 0) + 1);
      i += back + 3;
    }
  }
  return { count, levels: [...hitLevels], perLevel };
}

function classify(
  nqAll: Bar[], us2All: Bar[], todayKey: string, nowSm: number,
  structure: boolean | null, structureWhy: string,
  catalyst: boolean | null, catalystWhy: string,
  strict = false,
): { status: DayStatus; note: { label: BehaviorLabel; text: string } | null } {
  const nq = nqAll.filter((b) => b.sm < PRENY_END);
  const us2 = us2All.filter((b) => b.sm < PRENY_END);
  const { today, prior } = group(nq, todayKey);
  const checks: ClassifierCheck[] = [];
  const push = (key: CheckKey, label: string, weight: number, passed: boolean | null, reason: string) =>
    checks.push({ key, label, weight, passed, reason });

  const enough = today.length >= 24 && prior.length >= 2;
  const asia = today.filter((b) => b.sm < ASIA_END);
  const london = today.filter((b) => b.sm >= ASIA_END && b.sm < LONDON_END);

  // 1. Overnight range expansion
  if (enough) {
    const r = range(today) / (avg(prior.map(range)) || 1);
    push("overnight", "Overnight range", 15, r >= 1.3, r >= 1.3 ? "Expanded overnight range" : "Compressed overnight range");
  } else push("overnight", "Overnight range", 15, null, "Not enough overnight data");

  // 2. London expanding past Asia
  if (asia.length >= 12 && london.length >= 12) {
    const aH = Math.max(...asia.map((b) => b.h)), aL = Math.min(...asia.map((b) => b.l));
    const broke = london.some((b) => b.h > aH || b.l < aL);
    const ok = range(london) > range(asia) && broke;
    push("london", "London vs Asia", 15, ok, ok ? "London broke the Asia range" : "London stayed inside Asia");
  } else push("london", "London vs Asia", 15, null, "London session not formed yet");

  // 3. Volume
  const vols = today.map((b) => b.v).filter((v): v is number => v != null && v > 0);
  const priorVols = prior.flat().map((b) => b.v).filter((v): v is number => v != null && v > 0);
  if (vols.length >= 12 && priorVols.length >= 60) {
    const r = avg(vols.slice(-12)) / (avg(priorVols) || 1);
    push("volume", "Volume", 10, r >= 1.3, r >= 1.3 ? "Above-normal volume" : "Low volume");
  } else push("volume", "Volume", 10, null, "Volume unavailable");

  // 4. 5-minute displacement
  if (today.length >= 24) {
    const avgBody = avg(today.map((b) => Math.abs(b.c - b.o))) || 1;
    const hit = today.slice(-12).some((b) => {
      const rr = b.h - b.l || 1;
      const nearExtreme = b.c >= b.o ? (b.h - b.c) / rr <= 0.25 : (b.c - b.l) / rr <= 0.25;
      return Math.abs(b.c - b.o) >= 1.5 * avgBody && nearExtreme;
    });
    push("displacement", "5M displacement", 15, hit, hit ? "Strong 5-minute displacement" : "Small 5-minute candles");
  } else push("displacement", "5M displacement", 15, null, "Not enough 5-minute candles");

  // 5. Pre-NY momentum vs average daily range
  if (enough) {
    const move = Math.abs(today[today.length - 1].c - today[0].o);
    const ok = move >= 0.5 * (avg(prior.map(range)) || Infinity);
    push("momentum", "Pre-NY momentum", 10, ok, ok ? "Strong pre-NY momentum" : "Weak pre-NY momentum");
  } else push("momentum", "Pre-NY momentum", 10, null, "Not enough data for momentum");

  // 6. Directional structure (existing 15M/5M read)
  push("structure", "Index structure", 15, structure, structureWhy);
  // 7. Catalyst
  push("catalyst", "U.S. catalyst", 10, catalyst, catalystWhy);

  // 8. US02Y breaking / trending
  const y = group(us2, todayKey).today;
  if (y.length >= 24) {
    const base = y.filter((b) => b.sm < LONDON_END);
    const late = y.filter((b) => b.sm >= LONDON_END);
    const tail = y.slice(-6);
    if (base.length >= 12 && late.length >= 1) {
      const hi = Math.max(...base.map((b) => b.h)), lo = Math.min(...base.map((b) => b.l));
      const last = y[y.length - 1].c;
      const up = last > hi && tail[tail.length - 1].c > tail[0].o;
      const dn = last < lo && tail[tail.length - 1].c < tail[0].o;
      push("us02y", "US02Y", 10, up || dn, up || dn ? "US02Y breaking out" : "US02Y inside its range");
    } else push("us02y", "US02Y", 10, null, "US02Y range still forming");
  } else push("us02y", "US02Y", 10, null, "US02Y unavailable");

  const avail = checks.filter((c) => c.passed !== null);
  if (avail.length < 4 || nowSm < ASIA_END) {
    return { kind: "waiting", reason: avail.length < 4 ? "Not enough market data yet" : "Overnight session still forming", checks };
  }
  const max = avail.reduce((s, c) => s + c.weight, 0);
  const got = avail.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((got / max) * 100);
  const passes = avail.filter((c) => c.passed);
  const fast = score >= 65 && passes.length >= 3;
  const reason = fast
    ? passes.sort((a, b) => b.weight - a.weight).slice(0, 2).map((c) => c.reason).join(" + ")
    : avail.filter((c) => !c.passed).sort((a, b) => b.weight - a.weight).slice(0, 2).map((c) => c.reason).join(" + ");
  return { kind: "classified", label: fast ? "FAST" : "CHOPPY", developing: !fast && score >= 40, reason, score, checks };
}

export async function computeWeeklyBehavior(now: Date = new Date()): Promise<WeeklyBehaviorPayload> {
  const dow = laDow(now);
  const { key: todayKey, sm: nowSm } = laShifted(now.getTime());
  // Session key is the trading day: Sunday 15:00 PT onward already belongs to Monday.
  const sessionDow = laDow(new Date(now.getTime() + SHIFT_MIN * 60_000));

  const idle = (day: 1 | 5): DayStatus => {
    const name = day === 1 ? "Monday" : "Friday";
    if (dow === 6 || (dow === 0 && sessionDow !== 1) || (dow === 5 && sessionDow === 6)) {
      return { kind: "closed", reason: `Markets closed — classifies live ${day === 1 ? "from Sunday evening" : "from Thursday evening"}` };
    }
    return { kind: "not_today", reason: `Classifies live ${day === 1 ? "from Sunday evening" : "from Thursday evening"} into ${name}'s NY open` };
  };

  let monday = idle(1);
  let friday = idle(5);
  const target = sessionDow === 1 || sessionDow === 5 ? sessionDow : null;

  if (target) {
    try {
      const [nq, us2, quotes, econ] = await Promise.all([
        bars("NQ=F").catch(() => []),
        bars("ZT=F") // 2-year T-note futures: tracks US02Y inversely; breakout test is direction-agnostic
       .catch(() => []),
        fetchDelayedQuotes().catch(() => ({} as Record<string, any>)),
        fetchLiveEconEvents().catch(() => []),
      ]);
      const mtfs = [quotes["NASDAQ"]?.mtf, quotes["US30"]?.mtf].filter(Boolean) as { direction: string; state: string }[];
      const dir = mtfs.some((m) => (m.direction === "bullish" || m.direction === "bearish") && m.state === "trending");
      const structure = mtfs.length ? dir : null;
      const structureWhy = structure == null ? "Structure unavailable" : dir ? "Directional index structure" : "Indexes ranging";

      const sessionDate = todayKey;
      let catalyst: boolean | null = null;
      let catalystWhy = "Calendar unavailable";
      if (econ.length) {
        const hits = econ.filter((e) => e.date === sessionDate && e.impact === "high" && (!e.currency || e.currency === "USD") && e.time >= "05:00" && e.time <= "07:30");
        catalyst = hits.length > 0;
        catalystWhy = catalyst ? `${hits[0].title} near the open` : "No major U.S. release near the open";
      }
      const s = classify(nq, us2, todayKey, nowSm, structure, structureWhy, catalyst, catalystWhy);
      if (target === 1) monday = s; else friday = s;
    } catch {
      const w: DayStatus = { kind: "waiting", reason: "Market data feed unavailable", checks: [] };
      if (target === 1) monday = w; else friday = w;
    }
  }
  return { todayDow: sessionDow, monday, friday, computedAt: now.toISOString() };
}
