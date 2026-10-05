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
  const us30 = reading.todayDow === 1 ? reading.us30?.monday : reading.todayDow === 5 ? reading.us30?.friday : null;
  const snapshot = {
    label: status?.kind === "classified" ? status.label : null,
    developing: status?.kind === "classified" ? status.developing : null,
    note: reading.fixedNote?.label ?? null,
    us30_label: us30?.kind === "classified" ? us30.label : null,
    us30_developing: us30?.kind === "classified" ? us30.developing : null,
  };
  const startedAt = new Date().toISOString();
  const { error } = await supabaseAdmin.rpc("record_weekly_behavior_tick", {
    p_date: reading.sessionDate,
    p_weekday: reading.todayDow,
    p_reading: snapshot,
    p_last_bar_ts: reading.lastBarTs,
    p_candidates: reading.sweepEvents.map((event) => ({ kind: event.kind, ts: event.ts, side: event.side, message: event.message })),
  });
  if (error) console.error("Weekly activity recording failed", error.message);
  else await textNewEvents(reading.sessionDate, startedAt, { nq: status, ym: us30 }).catch((e) => console.error("Weekly activity text failed", e));
  return reading;
}
/** Texts only events inserted by this tick (created after it started); idempotent per event id. */
async function textNewEvents(sessionDate: string, since: string, reads: { nq: any; ym: any }) {
  const to = process.env["SMS_NOTIFY_ADDRESS"];
  if (!to) return;
  const { data } = await supabaseAdmin.from("weekly_behavior_events")
    .select("id, kind, message, created_at").eq("session_date", sessionDate).gte("created_at", since).order("created_at");
  if (!data?.length) return;
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  for (const e of data) {
    await sendTemplateEmail("sms-alert", to, { templateData: { text: smsText(e, reads) }, idempotencyKey: `wb-sms-${e.id}` })
      .catch((err) => console.error("Weekly activity text failed", err));
  }
}

const DAY: Record<string, string> = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday" };
const short = (d: any) => (d?.kind === "classified" ? d.label + (d.developing ? "*" : "") : "--");
function smsText(e: { kind: string; message: string; created_at: string }, reads: { nq: any; ym: any }) {
  const phase = reads.nq?.kind === "classified" ? reads.nq.phase : undefined;
  const time = new Date(e.created_at).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
  const [dayCode, ...rest] = e.message.split(" — ");
  const body = rest.join(" — ");
  if (e.kind === "classification") {
    const read = phase === "live" ? "live session read" : "premarket read";
    return `SHLM: ${DAY[dayCode] ?? dayCode} -> ${body.replace(/^Classified: /, "")} (NASDAQ, ${read}) | US30: ${short(reads.ym)}`.slice(0, 140);
  }
  if (e.kind === "us30_classification") {
    const ph = reads.ym?.kind === "classified" && reads.ym.phase === "live" ? "live session read" : "premarket read";
    return `SHLM: ${DAY[dayCode] ?? dayCode} -> US30 ${body.replace(/^US30 classified: /, "")} (${ph}) | NASDAQ: ${short(reads.nq)}`.slice(0, 140);
  }
  const shortMsg = body.replace(/^NASDAQ: /, "").replace(/^Swept (\w+) (high|low), awaiting confirmation$/, "sweep detected - $1 $2");
  return `SHLM: NASDAQ ${shortMsg}, ${time}`.slice(0, 140);
}
