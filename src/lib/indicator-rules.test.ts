import { describe, expect, it } from "vitest";
import { canManageIndicators, INDICATOR_OWNER_ID, indicatorInput, requestInput, tradingViewUsername } from "./indicator-rules";

describe("indicator permissions", () => {
  it("allows only the designated Founder with a current admin role", () => {
    expect(canManageIndicators(INDICATOR_OWNER_ID, true)).toBe(true);
    expect(canManageIndicators(INDICATOR_OWNER_ID, false)).toBe(false);
    expect(canManageIndicators("2c8404b9-fc09-4921-b90b-0bb8e6d6a61", true)).toBe(false);
  });
});
describe("indicator requests", () => {
  it("validates a username instead of a profile URL or handle prefix", () => {
    expect(tradingViewUsername.parse("  Joshua_Trader7  ")).toBe("Joshua_Trader7");
    for (const username of ["@Joshua", "https://tradingview.com/u/Joshua", "a", "two words", "a".repeat(61)]) {
      expect(tradingViewUsername.safeParse(username).success).toBe(false);
    }
  });
  it("requires the selected indicator and stable submission identity", () => {
    const data = { username: "Joshua_Trader", indicatorId: "638bd56e-a13c-45c2-9bce-9abbcf0e42e2", submissionId: "638bd56e-a13c-45c2-9bce-9abbcf0e42e3" };
    expect(requestInput.safeParse(data).success).toBe(true);
    expect(requestInput.safeParse({ ...data, indicatorId: undefined }).success).toBe(false);
    expect(requestInput.safeParse({ ...data, submissionId: undefined }).success).toBe(false);
  });
  it("requires a named indicator and enforces bounded descriptions", () => {
    expect(indicatorInput.safeParse({ name: "   " }).success).toBe(false);
    expect(indicatorInput.safeParse({ name: "SHLM SYSTEM", description: "x".repeat(501) }).success).toBe(false);
    expect(indicatorInput.parse({ name: " New Indicator " }).name).toBe("New Indicator");
  });
});