export const CHARACTERS = ["range bound", "slow", "choppy", "fast"] as const;
export type Character = typeof CHARACTERS[number];
export type SeasonalitySymbol = "NQ" | "YM";
export interface HistoryRow { symbol: string; date: string; character: string; open: number; high: number; low: number; close: number; volume: number; source: string; tradable: boolean | null; tradability_evidence: string | null; estimated?: boolean }
export interface CoverageRow { symbol: string; year: number; month: number; complete: boolean; source: string }
export interface CalendarRow { date: string; is_trading_day: boolean; jobs_report: boolean; first_trading_day: boolean; last_trading_day: boolean; options_expiry: boolean; source: string }
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function characterMix(rows: HistoryRow[]) {
  const valid = rows.filter(r => CHARACTERS.includes(r.character as Character));
  return CHARACTERS.map(character => ({ character, count: valid.filter(r => r.character === character).length, pct: valid.length ? valid.filter(r => r.character === character).length / valid.length * 100 : null }));
}

export function monthStats(rows: HistoryRow[], coverage: CoverageRow[], month: number) {
  const years = coverage.filter(c => c.month === month && c.complete).flatMap(c => {
    const sample = rows.filter(r => r.date.startsWith(`${c.year}-${String(month).padStart(2, "0")}-`)).sort((a, b) => a.date.localeCompare(b.date));
    const first = sample[0], last = sample.at(-1);
    return first && last && first.open > 0 ? [{ year: c.year, value: (last.close / first.open - 1) * 100 }] : [];
  });
  if (!years.length) return null;
  const sorted = [...years].sort((a, b) => b.value - a.value);
  return { average: years.reduce((s, r) => s + r.value, 0) / years.length, upPct: years.filter(r => r.value > 0).length / years.length * 100, best: sorted[0], worst: sorted.at(-1), count: years.length };
}

export function monthRank(rows: HistoryRow[], coverage: CoverageRow[], month: number): number | null {
  const all = MONTHS.map((_, i) => ({ month: i + 1, stats: monthStats(rows, coverage, i + 1) }));
  if (all.some(m => !m.stats)) return null;
  return all.sort((a, b) => (b.stats?.average ?? 0) - (a.stats?.average ?? 0)).findIndex(m => m.month === month) + 1;
}

export function weekdays(year: number, month: number) {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(year, month - 1, i + 1)))
    .filter(d => d.getUTCDay() !== 0 && d.getUTCDay() !== 6)
    .map(d => d.toISOString().slice(0, 10));
}

export function dayStats(rows: HistoryRow[], date: string) {
  // Calendar-date seasonality: the same month/day across recorded years, excluding weekends at ingestion.
  const sample = rows.filter(r => r.date.slice(5) === date.slice(5));
  const mix = characterMix(sample);
  const sorted = [...mix].sort((a, b) => b.count - a.count);
  const first = sorted[0], second = sorted[1];
  const tied = first && second && first.count === second.count;
  const observed = sample.filter(r => typeof r.tradable === "boolean" && r.tradability_evidence);
  return { sample, mix, character: sample.length && first && !tied ? first.character : null, second: second && second.count > 0 ? second.character : null, tied, odds: observed.length ? observed.filter(r => r.tradable).length / observed.length * 100 : null, oddsCount: observed.length };
}

export function calendarFlags(date: string, calendar: CalendarRow[]) {
  const d = new Date(`${date}T12:00:00Z`), day = d.getUTCDate(), month = d.getUTCMonth() + 1;
  const actual = calendar.find(c => c.date === date);
  const flags: string[] = [];
  if (actual?.first_trading_day) flags.push("First trading day of the month");
  if (actual?.last_trading_day) flags.push("Last trading day of the month");
  if (actual?.jobs_report) flags.push("Jobs report Friday");
  // Exact exchange/event flags are imported; calendar-position flags below are not event predictions.
  if (actual?.options_expiry) flags.push("Third Friday options expiry");
  else if (d.getUTCDay() === 5 && day >= 15 && day <= 21) flags.push("Third Friday · expiry schedule unverified");
  if (d.getUTCDay() === 1) flags.push("Monday after the weekend");
  const end = new Date(Date.UTC(d.getUTCFullYear(), month, 0));
  const startOfEndWeek = end.getUTCDate() - ((end.getUTCDay() + 6) % 7);
  if (month % 3 === 0 && day >= startOfEndWeek) flags.push("Quarter end week");
  return { flags, calendarVerified: Boolean(actual), closed: actual?.is_trading_day === false };
}

export const CHARACTER_GUIDE: Record<Character, { causes: string; verdict: string; do: string[]; avoid: string[] }> = {
  "range bound": {
    causes: "Balanced buying and selling, a lack of fresh catalysts, or price waiting near established value can keep movement contained. These are possible mechanisms, not verified causes for this date.",
    verdict: "Trade the edges only",
    do: ["Wait for a defined range and confirmation at its boundaries.", "Keep risk defined and reassess if the range breaks."],
    avoid: ["Chasing moves through the middle of the range.", "Assuming every boundary will hold."],
  },
  slow: {
    causes: "Thin participation, holiday-adjacent sessions, or waiting for a later release can reduce follow-through. These are possible mechanisms, not verified causes for this date.",
    verdict: "Yes, keep targets small",
    do: ["Use realistic targets and wait for clear structure.", "Account for spread and execution costs before entering."],
    avoid: ["Expecting a large expansion without new information.", "Forcing extra trades because price is quiet."],
  },
  choppy: {
    causes: "Conflicting flows, repeated liquidity tests, or uncertainty around new information can create reversals and failed breaks. These are possible mechanisms, not verified causes for this date.",
    verdict: "Reduce size or sit out",
    do: ["Reduce exposure and wait for a cleaner environment.", "Respect your session stop and trade limit."],
    avoid: ["Revenge trading after failed breaks.", "Increasing size to recover losses."],
  },
  fast: {
    causes: "A fresh catalyst, broad participation, or a repricing of expectations can accelerate movement. These are possible mechanisms, not verified causes for this date.",
    verdict: "Yes, with strict risk rules",
    do: ["Define invalidation before entering and size for current volatility.", "Wait for confirmation and allow for slippage."],
    avoid: ["Chasing an extended move without a planned entry.", "Widening stops or ignoring maximum session risk."],
  },
};