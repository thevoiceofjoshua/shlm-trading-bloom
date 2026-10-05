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
  | {
      kind: "classified"; label: BehaviorLabel; developing: boolean; reason: string; score: number; checks: ClassifierCheck[];
      /** "premarket" = overnight/pre-6:30 setup read; "live" = realized NY session read. */
      phase?: "premarket" | "live";
      /** When phase is "live", the unchanged premarket verdict for context. */
      premarketLabel?: BehaviorLabel;
    }
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
  sessionDate: string;
  lastBarTs: number;
  sweepEvents: SweepEvent[];
}

export interface SweepEvent { kind: "detected" | "confirmed" | "canceled"; ts: number; side: "high" | "low"; message: string }

export interface Bar { t: number; o: number; h: number; l: number; c: number; v: number | null; key: string; sm: number }

const SHIFT_MIN = 9 * 60; // 15:00 PT prior day → 00:00 of the session key
const ASIA_END = 9 * 60; // 00:00 PT
const LONDON_END = 14 * 60; // 05:00 PT
const PRENY_END = 15 * 60 + 30; // 06:30 PT
const NY_END = 22 * 60; // 13:00 PT
const LIVE_MIN_BARS = 6; // 30 minutes of NY trading before the live read takes over
const LIVE_SETTLED_BARS = 12; // after 60 minutes the live read is no longer "developing"

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});
export function laShifted(tsMs: number): { key: string; sm: number } {
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

type SweepRead =
  | { state: "none" }
  | { state: "pending" | "confirmed"; side: "high" | "low"; how?: string };

/**
 * Single-sided London sweep: a candle pierces the London high/low by ≥ minFrac × avg candle,
 * then within 3 candles an engulfing reversal and/or a close through the last minor swing confirms it.
 * A later close back beyond the swept extreme cancels it and scanning resumes.
 */
export function detectSweep(
  today: Bar[], london: Bar[], avgCandle: number, minFrac: number, requireBoth: boolean, events?: SweepEvent[],
  opts: { startSm?: number; name?: string } = {},
): SweepRead {
  const name = opts.name ?? "London";
  const lH = Math.max(...london.map((b) => b.h)), lL = Math.min(...london.map((b) => b.l));
  const minDist = minFrac * (avgCandle || 0);
  if (!(minDist > 0)) return { state: "none" };
  let result: SweepRead = { state: "none" };
  let i = today.findIndex((b) => b.sm >= (opts.startSm ?? LONDON_END));
  if (i < 0) return result;
  while (i < today.length) {
    const s = today[i];
    const side: "high" | "low" | null = s.h - lH >= minDist ? "high" : lL - s.l >= minDist ? "low" : null;
    if (!side) { i++; continue; }
    if (i === 0 || !(side === "high" ? today[i - 1].h - lH >= minDist : lL - today[i - 1].l >= minDist)) {
      events?.push({ kind: "detected", ts: s.t, side, message: `Swept ${name} ${side}, awaiting confirmation` });
    }
    const hi = side === "high";
    // Minor swing point formed during the approach.
    let swing: number | null = null;
    for (let k = i - 3; k >= Math.max(2, i - 12); k--) {
      const b = today[k], n = [today[k - 1], today[k - 2], today[k + 1], today[k + 2]];
      if (hi ? n.every((x) => b.l < x.l) : n.every((x) => b.h > x.h)) { swing = hi ? b.l : b.h; break; }
    }
    if (swing == null) {
      const pre = today.slice(Math.max(0, i - 6), i);
      if (pre.length) swing = hi ? Math.min(...pre.map((b) => b.l)) : Math.max(...pre.map((b) => b.h));
    }
    const next = today[i + 1];
    const sTop = Math.max(s.o, s.c), sBot = Math.min(s.o, s.c);
    const engulf = !!next && (hi ? next.c < next.o && next.o >= sTop && next.c <= sBot : next.c > next.o && next.o <= sBot && next.c >= sTop);
    const win = today.slice(i + 1, i + 4);
    const bosIdx = swing == null ? -1 : win.findIndex((b) => (hi ? b.c < swing! : b.c > swing!));
    const bos = bosIdx >= 0;
    const ok = requireBoth ? engulf && bos : engulf || bos;
    if (!ok) {
      if (win.length < 3) result = { state: "pending", side }; // window still open
      else events?.push({ kind: "canceled", ts: win[2].t, side, message: "Sweep canceled, watching both sides again" });
      i++;
      continue;
    }
    const confirmAt = i + 1 + (engulf ? 0 : bosIdx);
    const how = engulf && bos ? "engulfing + break of structure" : engulf ? "engulfing" : "break of structure";
    events?.push({ kind: "confirmed", ts: today[confirmAt].t, side, message: `Confirmed reversal (${how}) — reading toward ${name} ${side === "high" ? "low" : "high"}` });
    const cancelAt = today.slice(confirmAt + 1).findIndex((b) => (hi ? b.c > lH : b.c < lL));
    if (cancelAt >= 0) {
      events?.push({ kind: "canceled", ts: today[confirmAt + 1 + cancelAt].t, side, message: "Sweep canceled, watching both sides again" });
      result = { state: "none" }; i = confirmAt + 1 + cancelAt + 1; continue;
    }
    result = { state: "confirmed", side, how };
    i = confirmAt + 1;
  }
  return result;
}

function classify(
  nqAll: Bar[], us2All: Bar[], todayKey: string, nowSm: number,
  structure: boolean | null, structureWhy: string,
  catalyst: boolean | null, catalystWhy: string,
  strict = false,
): { status: DayStatus; note: { label: BehaviorLabel; text: string } | null; sweepEvents: SweepEvent[] } {
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
    return { status: { kind: "waiting", reason: avail.length < 4 ? "Not enough market data yet" : "Overnight session still forming", checks }, note: null, sweepEvents: [] };
  }
  const max = avail.reduce((s, c) => s + c.weight, 0);
  const got = avail.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((got / max) * 100);
  const passes = avail.filter((c) => c.passed);
  const fails = avail.filter((c) => c.passed === false);
  const fast = score >= 65 && passes.length >= 3;
  const chk = (k: CheckKey) => checks.find((c) => c.key === k)?.passed ?? null;

  // ---- Level map for fakeout / range reads ----
  const keys = [...new Set(nqAll.map((b) => b.key))].filter((k) => k < todayKey).sort();
  const prevDay = keys.length ? nqAll.filter((b) => b.key === keys[keys.length - 1]) : [];
  const levels: Level[] = [];
  const hl = (bs: Bar[], name: string, from: number) => {
    if (bs.length < 6) return;
    levels.push({ name, price: Math.max(...bs.map((b) => b.h)), side: "high", from });
    levels.push({ name, price: Math.min(...bs.map((b) => b.l)), side: "low", from });
  };
  if (prevDay.length >= 60) hl(prevDay, "prior-day", 0);
  hl(asia, "Asia", ASIA_END);
  const londonFormed = nowSm >= LONDON_END && london.length >= 12;
  if (londonFormed) hl(london, "London", LONDON_END);
  const fb = failedBreaks(today, levels);

  // ---- RANGE BOUND (single-sided London sweep + confirmed reversal) ----
  const avgCandle = avg(today.map((b) => b.h - b.l));
  const sweepEvents: SweepEvent[] = [];
  const sweep = londonFormed ? detectSweep(today, london, avgCandle, 0.25, false, sweepEvents) : { state: "none" as const };
  const sweepStrict = londonFormed && strict ? detectSweep(today, london, avgCandle, 0.5, true) : { state: "none" as const };
  const rangeConds = [londonFormed, sweep.state !== "none", sweep.state === "confirmed"];
  const rangeReason = sweep.state === "none"
    ? "No confirmed London sweep"
    : `Swept London ${sweep.side}, ${sweep.state === "confirmed" ? `confirmed reversal (${sweep.how})` : "awaiting confirmation"}`;

  // ---- CHOPPY (fakeouts) ----
  const choppyConds = [fb.count >= 3, fb.levels.length >= 2, chk("structure") === false, chk("momentum") === false];

  // ---- SLOW (quiet) ----
  const overnightRatio = enough ? range(today) / (avg(prior.map(range)) || 1) : null;
  const quiet: { v: boolean | null; why: string }[] = [
    { v: chk("volume") === null ? null : chk("volume") === false, why: "Low volume" },
    { v: overnightRatio == null ? null : overnightRatio < 0.8, why: "Compressed overnight range" },
    { v: chk("displacement") === null ? null : chk("displacement") === false, why: "Small 5-minute candles" },
    { v: chk("momentum") === null ? null : chk("momentum") === false, why: "Weak pre-NY momentum" },
    { v: chk("london") === null ? null : chk("london") === false, why: "London stayed inside Asia" },
  ];
  const quietAvail = quiet.filter((q) => q.v !== null);
  const quietCount = quiet.filter((q) => q.v === true).length;
  const slowOk = quietAvail.length >= 3 && quietCount >= 4;

  const frac = (c: boolean[]) => c.filter(Boolean).length / c.length;
  const reads: { label: BehaviorLabel; ok: boolean; close: number; reason: string }[] = [
    { label: "RANGE BOUND", ok: rangeConds.every(Boolean), close: frac(rangeConds), reason: rangeReason },
    {
      label: "CHOPPY", ok: choppyConds.every(Boolean), close: frac(choppyConds),
      reason: fb.count ? `Repeated false breaks at ${fb.levels.join(" and ")} levels` : "No follow-through on level breaks",
    },
    {
      label: "SLOW", ok: slowOk, close: Math.min(1, quietCount / 4),
      reason: quiet.filter((q) => q.v === true).slice(0, 2).map((q) => q.why).join(" + ") || "Quiet market",
    },
  ];

  let status: DayStatus;
  if (fast) {
    const reason = [...passes].sort((a, b) => b.weight - a.weight).slice(0, 2).map((c) => c.reason).join(" + ");
    status = { kind: "classified", label: "FAST", developing: false, reason, score, checks };
  } else {
    const hit = reads.find((r) => r.ok);
    const pick = hit ?? reads.reduce((a, b) => (b.close > a.close ? b : a));
    status = { kind: "classified", label: pick.label, developing: !hit, reason: pick.reason, score, checks };
  }

  // ---- Strict caution note (Tue/Wed/Thu) ----
  let note: { label: BehaviorLabel; text: string } | null = null;
  if (strict && avail.length >= 7) {
    const low = score <= 15 && fails.length >= 7;
    let label: BehaviorLabel | null = null;
    if (score >= 90 && passes.length >= 7) label = "FAST";
    else if (low && sweepStrict.state === "confirmed") label = "RANGE BOUND";
    else if (low && fb.count >= 5 && fb.levels.length >= 3 && chk("structure") === false && chk("momentum") === false) label = "CHOPPY";
    else if (low && quietAvail.length === 5 && quietCount === 5) label = "SLOW";
    if (label) note = { label, text: `Note: conditions reading unusually ${label}` };
  }
  return { status, note, sweepEvents };
}

/**
 * Live NY-session read (additive second phase). Uses only bars from the 6:30 PT open onward and
 * compares them with the same elapsed window on prior sessions. The premarket read is untouched.
 */
function classifyLive(
  nqAll: Bar[], todayKey: string, pre: DayStatus,
  structure: boolean | null, structureWhy: string,
  catalyst: boolean | null, catalystWhy: string,
  events: SweepEvent[],
): DayStatus | null {
  const { today: full, prior } = group(nqAll, todayKey);
  const post = full.filter((b) => b.sm >= PRENY_END && b.sm < NY_END);
  if (post.length < LIVE_MIN_BARS || prior.length < 2) return null;
  const preBars = full.filter((b) => b.sm < PRENY_END);
  const asia = preBars.filter((b) => b.sm < ASIA_END);
  const london = preBars.filter((b) => b.sm >= ASIA_END && b.sm < LONDON_END);
  const elapsed = post[post.length - 1].sm - PRENY_END + 5;
  const windows = prior
    .map((d) => d.filter((b) => b.sm >= PRENY_END && b.sm < PRENY_END + elapsed))
    .filter((w) => w.length >= Math.min(LIVE_MIN_BARS, post.length));
  if (windows.length < 2) return null;

  const checks: ClassifierCheck[] = [];
  const push = (key: CheckKey, label: string, weight: number, passed: boolean | null, reason: string) =>
    checks.push({ key, label, weight, passed, reason });

  const priorRange = avg(windows.map(range)) || 1;
  const rangeRatio = range(post) / priorRange;
  push("overnight", "NY session range", 15, rangeRatio >= 1.3, rangeRatio >= 1.3 ? "Expanded NY session range" : "Normal-to-tight NY range");

  const vols = post.map((b) => b.v).filter((v): v is number => v != null && v > 0);
  const priorVols = windows.flat().map((b) => b.v).filter((v): v is number => v != null && v > 0);
  if (vols.length >= LIVE_MIN_BARS && priorVols.length >= 12) {
    const r = avg(vols) / (avg(priorVols) || 1);
    push("volume", "NY volume", 10, r >= 1.3, r >= 1.3 ? "Above-normal NY volume" : "Normal-to-low NY volume");
  } else push("volume", "NY volume", 10, null, "Volume unavailable");

  const priorBody = avg(windows.flat().map((b) => Math.abs(b.c - b.o))) || 1;
  const disp = post.filter((b) => {
    const rr = b.h - b.l || 1;
    const nearExtreme = b.c >= b.o ? (b.h - b.c) / rr <= 0.25 : (b.c - b.l) / rr <= 0.25;
    return Math.abs(b.c - b.o) >= 1.5 * priorBody && nearExtreme;
  });
  push("displacement", "5M displacement", 15, disp.length > 0, disp.length ? "Strong 5-minute displacement in NY" : "Small 5-minute candles in NY");

  const move = Math.abs(post[post.length - 1].c - post[0].o);
  const momOk = move >= 0.6 * priorRange;
  push("momentum", "NY momentum", 10, momOk, momOk ? "Strong directional move since the open" : "Little net progress since the open");

  push("structure", "Index structure", 15, structure, structureWhy);
  push("catalyst", "U.S. catalyst", 10, catalyst, catalystWhy);

  const avail = checks.filter((c) => c.passed !== null);
  if (avail.length < 4) return null;
  const max = avail.reduce((s, c) => s + c.weight, 0);
  const got = avail.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((got / max) * 100);
  const passes = avail.filter((c) => c.passed);
  const chk = (k: CheckKey) => checks.find((c) => c.key === k)?.passed ?? null;
  const fast = score >= 65 && passes.length >= 3;

  // Levels: prior day, Asia, London, and the premarket range itself.
  const keys = [...new Set(nqAll.map((b) => b.key))].filter((k) => k < todayKey).sort();
  const prevDay = keys.length ? nqAll.filter((b) => b.key === keys[keys.length - 1]) : [];
  const levels: Level[] = [];
  const hl = (bs: Bar[], name: string) => {
    if (bs.length < 6) return;
    levels.push({ name, price: Math.max(...bs.map((b) => b.h)), side: "high", from: PRENY_END });
    levels.push({ name, price: Math.min(...bs.map((b) => b.l)), side: "low", from: PRENY_END });
  };
  if (prevDay.length >= 60) hl(prevDay, "prior-day");
  hl(asia, "Asia");
  hl(london, "London");
  hl(preBars, "premarket");
  const fb = failedBreaks(post, levels);

  // Sweeps during the live session: London levels (continuing the premarket scan) and the premarket range.
  const avgCandle = avg(full.map((b) => b.h - b.l));
  if (london.length >= 12) detectSweep(full, london, avgCandle, 0.25, false, events);
  const sweep = preBars.length >= 24
    ? detectSweep(full, preBars, avgCandle, 0.25, false, events, { startSm: PRENY_END, name: "premarket" })
    : { state: "none" as const };

  const quiet = [rangeRatio < 0.8, chk("volume") === false, chk("displacement") === false, chk("momentum") === false];
  const quietCount = quiet.filter(Boolean).length;
  const choppyConds = [fb.count >= 3, fb.levels.length >= 2, chk("momentum") === false];
  const rangeConds = [sweep.state !== "none", sweep.state === "confirmed"];
  const frac = (c: boolean[]) => c.filter(Boolean).length / c.length;
  const reads: { label: BehaviorLabel; ok: boolean; close: number; reason: string }[] = [
    {
      label: "RANGE BOUND", ok: rangeConds.every(Boolean), close: frac(rangeConds),
      reason: sweep.state === "none" ? "No confirmed sweep of the premarket range"
        : `Swept premarket ${sweep.side}, ${sweep.state === "confirmed" ? `confirmed reversal (${sweep.how})` : "awaiting confirmation"}`,
    },
    {
      label: "CHOPPY", ok: choppyConds.every(Boolean), close: frac(choppyConds),
      reason: fb.count ? `Repeated false breaks at ${fb.levels.join(" and ")} levels since the open` : "No follow-through on level breaks",
    },
    { label: "SLOW", ok: quietCount >= 3, close: Math.min(1, quietCount / 3), reason: "Quiet NY session so far" },
  ];

  const settling = post.length < LIVE_SETTLED_BARS;
  const premarketLabel = pre.kind === "classified" ? pre.label : undefined;
  if (fast) {
    const reason = [...passes].sort((a, b) => b.weight - a.weight).slice(0, 2).map((c) => c.reason).join(" + ");
    return { kind: "classified", label: "FAST", developing: settling, reason, score, checks, phase: "live", premarketLabel };
  }
  const hit = reads.find((r) => r.ok);
  const pick = hit ?? reads.reduce((a, b) => (b.close > a.close ? b : a));
  return { kind: "classified", label: pick.label, developing: settling || !hit, reason: pick.reason, score, checks, phase: "live", premarketLabel };
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
  let fixedNote: WeeklyBehaviorPayload["fixedNote"] = null;
  let sweepEvents: SweepEvent[] = [];
  let lastBarTs = 0;
  const live = sessionDow >= 1 && sessionDow <= 5 ? sessionDow : null;
  const target = sessionDow === 1 || sessionDow === 5 ? sessionDow : null;

  if (live) {
    try {
      const [nq, us2, quotes, econ] = await Promise.all([
        bars("NQ=F").catch(() => []),
        bars("ZT=F") // 2-year T-note futures: tracks US02Y inversely; breakout test is direction-agnostic
       .catch(() => []),
        fetchDelayedQuotes().catch(() => ({} as Record<string, any>)),
        fetchLiveEconEvents().catch(() => []),
      ]);
      lastBarTs = Math.max(0, ...nq.filter((b) => b.key === todayKey && b.sm < NY_END).map((b) => b.t));
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
      const r = classify(nq, us2, todayKey, nowSm, structure, structureWhy, catalyst, catalystWhy, !target);
      sweepEvents = r.sweepEvents;
      let status: DayStatus = r.status.kind === "classified" ? { ...r.status, phase: "premarket" } : r.status;
      const liveRead = classifyLive(nq, todayKey, status, structure, structureWhy, catalyst, catalystWhy, sweepEvents);
      if (liveRead && target) status = liveRead;
      if (target === 1) monday = status;
      else if (target === 5) friday = status;
      else if (r.note) fixedNote = { day: live as 2 | 3 | 4, ...r.note };
    } catch {
      const w: DayStatus = { kind: "waiting", reason: "Market data feed unavailable", checks: [] };
      if (target === 1) monday = w; else if (target === 5) friday = w;
    }
  }
  return { todayDow: sessionDow, monday, friday, fixedNote, computedAt: now.toISOString(), sessionDate: todayKey, lastBarTs, sweepEvents };
}
