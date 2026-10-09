export interface DailyBar { date: string; open: number; high: number; low: number; close: number; volume: number }
export type EstimatedCharacter = "range bound" | "slow" | "choppy" | "fast";

const LOOKBACK = 20, MIN_PRIOR = 10;

/** ESTIMATED day character from range vs trailing average range and volume vs trailing average volume.
 *  choppy = wide range with a small close-to-open move (travelled but went nowhere). */
export function classifyDay(bar: DailyBar, avgRange: number, avgVolume: number): EstimatedCharacter {
  const range = bar.high - bar.low;
  const rr = avgRange > 0 ? range / avgRange : 1;
  const vr = avgVolume > 0 && bar.volume > 0 ? bar.volume / avgVolume : 1;
  const body = range > 0 ? Math.abs(bar.close - bar.open) / range : 0;
  if (rr >= 1 && body < 0.3) return "choppy";
  if (rr >= 1.2) return "fast";
  if (rr < 0.8 && vr < 0.9) return "slow";
  return "range bound";
}

export function estimateCharacters(bars: DailyBar[]) {
  return bars.map((bar, i) => {
    const prior = bars.slice(Math.max(0, i - LOOKBACK), i);
    if (prior.length < MIN_PRIOR) return { ...bar, character: null as EstimatedCharacter | null };
    const avgRange = prior.reduce((s, b) => s + (b.high - b.low), 0) / prior.length;
    const vols = prior.filter((b) => b.volume > 0);
    const avgVolume = vols.length ? vols.reduce((s, b) => s + b.volume, 0) / vols.length : 0;
    return { ...bar, character: classifyDay(bar, avgRange, avgVolume) as EstimatedCharacter | null };
  });
}
