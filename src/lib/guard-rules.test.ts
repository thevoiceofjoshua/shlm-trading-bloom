import { describe, it, expect } from "vitest";
import { guardLock, guardPeriod, guardTradeInput } from "./guard-rules";
describe("existing Guard rules", () => {
  it("locks on one win", () => { expect(guardLock(["win"])).toBe("one-win"); expect(guardLock(["loss", "win"])).toBe("one-win"); });
  it("locks after three trades, including BE", () => { expect(guardLock(["loss", "loss"])).toBeNull(); expect(guardLock(["loss", "breakeven", "loss"])).toBe("three-trade-limit"); });
  it("keeps 06:20–07:30 and 17:00–19:15 Pacific windows", () => {
    for (const [time, open] of [["13:19", false], ["13:20", true], ["14:29", true], ["14:30", false], ["23:59", false]] as const) expect(guardPeriod(new Date(`2026-10-29T${time}:00Z`)).windowOpen).toBe(open);
    expect(guardPeriod(new Date("2026-10-30T00:00:00Z")).windowOpen).toBe(true);
    expect(guardPeriod(new Date("2026-10-30T02:15:00Z")).windowOpen).toBe(false);
  });
  it("keeps 06:15 and 16:50 resets", () => {
    expect(guardPeriod(new Date("2026-10-29T13:14:00Z")).sessionKey).toBe("2026-10-28-pm");
    expect(guardPeriod(new Date("2026-10-29T13:15:00Z")).sessionKey).toBe("2026-10-29-am");
    expect(guardPeriod(new Date("2026-10-29T23:50:00Z")).sessionKey).toBe("2026-10-29-pm");
  });
  it("handles winter Pacific time", () => { expect(guardPeriod(new Date("2026-11-02T14:20:00Z")).windowOpen).toBe(true); });
  it("validates outcome P&L and BE fees", () => {
    const base = { id: "27be6c2d-ce77-425b-bc69-53026daf099b", sessionKey: "2026-10-29-am", instrument: "MNQ" };
    expect(guardTradeInput.safeParse({ ...base, outcome: "win", pnl: 1 }).success).toBe(true);
    expect(guardTradeInput.safeParse({ ...base, outcome: "win", pnl: -1 }).success).toBe(false);
    expect(guardTradeInput.safeParse({ ...base, outcome: "loss", pnl: 0 }).success).toBe(false);
    expect(guardTradeInput.safeParse({ ...base, outcome: "breakeven", pnl: -2.5 }).success).toBe(true);
  });
});