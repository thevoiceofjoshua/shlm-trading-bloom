import { expect, test } from "vitest";
import { pacificMonth } from "./referrers.server";
test("pacific month", () => { expect(pacificMonth(new Date("2026-11-01T05:00:00Z"))).toBe("2026-10-01"); });
