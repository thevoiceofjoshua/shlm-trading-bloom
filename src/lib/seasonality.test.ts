/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { CHARACTERS, CHARACTER_GUIDE, calendarFlags, characterMix, dayStats, monthRank, monthStats, weekdays, type HistoryRow } from "./seasonality";

const row = (date: string, close: number, character = "slow", extra: Partial<HistoryRow> = {}): HistoryRow => ({ symbol: "NQ", date, character, open: 100, high: Math.max(100, close), low: Math.min(100, close), close, volume: 100, source: "Unit test fixture — never imported", tradable: null, tradability_evidence: null, ...extra });
describe("Seasonality integrity", () => {
  test("no history yields no performance, rank, character or odds", () => {
    expect(monthStats([], [], 1)).toBeNull();
    expect(monthRank([], [], 1)).toBeNull();
    expect(dayStats([], "2026-01-02").character).toBeNull();
    expect(dayStats([], "2026-01-02").odds).toBeNull();
    expect(characterMix([]).every(m => m.pct === null)).toBe(true);
  });
  test("partial months never become full month returns", () => {
    expect(monthStats([row("2025-01-02", 110)], [{ symbol: "NQ", year: 2025, month: 1, complete: false, source: "test" }], 1)).toBeNull();
  });
  test("returns, up years, best and worst use verified full months", () => {
    const result = monthStats([row("2024-01-02", 100), row("2024-01-31", 120), row("2025-01-02", 100), row("2025-01-31", 90)], [2024, 2025].map(year => ({ symbol: "NQ", year, month: 1, complete: true, source: "test" })), 1);
    expect(result?.average).toBeCloseTo(5);
    expect(result?.upPct).toBe(50);
    expect(result?.best?.year).toBe(2024);
    expect(result?.worst?.year).toBe(2025);
    expect(result?.count).toBe(2);
  });
  test("rank of 12 requires all 12 calendar months", () => {
    expect(monthRank([row("2025-01-02", 110)], [{ symbol: "NQ", year: 2025, month: 1, complete: true, source: "test" }], 1)).toBeNull();
  });
  test("daily date axis contains Monday to Friday only", () => {
    const dates = weekdays(2026, 10);
    expect(dates).toContain("2026-10-09");
    expect(dates).not.toContain("2026-10-10");
    expect(dates).not.toContain("2026-10-11");
    expect(dates).toHaveLength(22);
  });
  test("daily character is observed frequency, not an invented projection", () => {
    const result = dayStats([row("2024-01-02", 100, "fast"), row("2025-01-02", 100, "fast"), row("2026-01-02", 100, "slow")], "2027-01-02");
    expect(result.character).toBe("fast");
    expect(result.second).toBe("slow");
    expect(result.mix.find(m => m.character === "fast")?.pct).toBeCloseTo(200 / 3);
    expect(result.odds).toBeNull();
  });
  test("ties do not fabricate a most likely character", () => {
    expect(dayStats([row("2024-01-02", 100, "fast"), row("2025-01-02", 100, "slow")], "2026-01-02").character).toBeNull();
  });
  test("tradable odds require assessed observations with evidence", () => {
    const rows = [row("2024-01-02", 100, "fast", { tradable: true, tradability_evidence: "Reviewed outcome" }), row("2025-01-02", 100, "slow", { tradable: false, tradability_evidence: "Reviewed outcome" }), row("2026-01-02", 100, "fast")];
    expect(dayStats(rows, "2027-01-02").odds).toBe(50);
    expect(dayStats(rows, "2027-01-02").oddsCount).toBe(2);
  });
  test("jobs report and first/last trading days require imported calendar", () => {
    const flags = calendarFlags("2026-10-02", []).flags;
    expect(flags).not.toContain("Jobs report Friday");
    expect(flags).not.toContain("First trading day of the month");
    expect(calendarFlags("2026-10-05", []).flags).toContain("Monday after the weekend");
    expect(calendarFlags("2026-09-30", []).flags).toContain("Quarter end week");
  });
  test("range bound verdict is trade the edges only", () => expect(CHARACTER_GUIDE["range bound"].verdict.toLowerCase()).toBe("trade the edges only"));
  test("slow verdict keeps targets small", () => expect(CHARACTER_GUIDE.slow.verdict.toLowerCase()).toBe("yes, keep targets small"));
  test("choppy verdict reduces size or sits out", () => expect(CHARACTER_GUIDE.choppy.verdict.toLowerCase()).toBe("reduce size or sit out"));
  test("fast verdict requires strict risk rules", () => expect(CHARACTER_GUIDE.fast.verdict.toLowerCase()).toBe("yes, with strict risk rules"));
  test("all four characters have guidance", () => expect(CHARACTERS.every(c => CHARACTER_GUIDE[c].do.length > 0 && CHARACTER_GUIDE[c].avoid.length > 0)).toBe(true));
});