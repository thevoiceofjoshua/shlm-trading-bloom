import { describe, it, expect } from "vitest";
import { classifyDay } from "./seasonality-estimate";

const bar = (o: number, h: number, l: number, c: number, v = 100) => ({ date: "2024-01-02", open: o, high: h, low: l, close: c, volume: v });

describe("estimated day character", () => {
  it("wide range with small close-to-open move is choppy", () => expect(classifyDay(bar(100, 112, 100, 101), 10, 100)).toBe("choppy"));
  it("wide range with a real move is fast", () => expect(classifyDay(bar(100, 112, 100, 111), 10, 100)).toBe("fast"));
  it("narrow range on light volume is slow", () => expect(classifyDay(bar(100, 105, 100, 103), 10, 50)).toBe("slow"));
  it("average range is range bound", () => expect(classifyDay(bar(100, 109, 100, 105), 10, 100)).toBe("range bound"));
});
