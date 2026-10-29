import { z } from "zod";

export const guardTradeInput = z.object({
  id: z.string().uuid(), sessionKey: z.string().regex(/^\d{4}-\d{2}-\d{2}-(am|pm)$/),
  instrument: z.enum(["NQ", "MNQ", "YM", "MYM", "GC", "MGC"]), account: z.string().trim().min(1).max(100).default("Default"),
  outcome: z.enum(["win", "loss", "breakeven"]), pnl: z.number().finite().max(999999999999).min(-999999999999),
  note: z.string().trim().max(2000).default(""), direction: z.enum(["", "long", "short"]).default(""),
}).superRefine((data, context) => {
  if (data.outcome === "win" && data.pnl <= 0 || data.outcome === "loss" && data.pnl >= 0 || data.outcome === "breakeven" && data.pnl > 0)
    context.addIssue({ code: "custom", path: ["pnl"], message: "WIN needs positive P&L, LOSS negative P&L, and breakeven allows zero or fees." });
});
export function guardLock(outcomes: string[]) {
  return outcomes.includes("win") ? "one-win" : outcomes.length >= 3 ? "three-trade-limit" : null;
}
export function guardPeriod(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = (key: string) => parts.find(p => p.type === key)?.value ?? "0";
  let date = `${value("year")}-${value("month")}-${value("day")}`;
  const minutes = Number(value("hour")) * 60 + Number(value("minute"));
  if (minutes < 375) date = new Date(Date.parse(date + "T12:00:00Z") - 86400000).toISOString().slice(0, 10);
  const evening = minutes >= 1010 || minutes < 375;
  return { sessionKey: `${date}-${evening ? "pm" : "am"}`, date, period: evening ? "gold" : "ny-open", windowOpen: minutes >= 380 && minutes < 450 || minutes >= 1020 && minutes < 1155 };
}