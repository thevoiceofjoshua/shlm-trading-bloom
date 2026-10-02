import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeWeeklyBehavior, type WeeklyBehaviorPayload } from "@/lib/weekly-behavior.server";

export function sessionDay(now: Date = new Date()) {
  // 15:00 Pacific begins the next trading day, including DST transitions.
  const shifted = new Date(now.getTime() + 9 * 60 * 60_000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(shifted);
  const part = (name: string) => parts.find((p) => p.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function recordWeeklyActivity(data?: WeeklyBehaviorPayload) {
  const reading = data ?? await computeWeeklyBehavior();
  if (reading.todayDow < 1 || reading.todayDow > 5 || reading.lastBarTs === 0) return reading;
  const status = reading.todayDow === 1 ? reading.monday : reading.todayDow === 5 ? reading.friday : null;
  const snapshot = {
    label: status?.kind === "classified" ? status.label : null,
    developing: status?.kind === "classified" ? status.developing : null,
    note: reading.fixedNote?.label ?? null,
  };
  const { error } = await supabaseAdmin.rpc("record_weekly_behavior_tick", {
    p_date: reading.sessionDate,
    p_weekday: reading.todayDow,
    p_reading: snapshot,
    p_last_bar_ts: reading.lastBarTs,
    p_candidates: reading.sweepEvents,
  });
  if (error) console.error("Weekly activity recording failed", error.message);
  return reading;
}