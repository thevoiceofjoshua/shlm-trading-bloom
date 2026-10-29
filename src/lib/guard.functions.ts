import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkAccess } from "@/lib/hub.functions";
import { guardPeriod, guardTradeInput } from "@/lib/guard-rules";
import { VOICE_FIELDS } from "@/lib/journal-voice";

export const getGuard = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!(await checkAccess(context)).hasAccess) throw new Error("Centre membership required.");
  const period = guardPeriod(new Date());
  const { data: session, error } = await context.supabase.from("guard_sessions").select("*").eq("user_id", context.userId).eq("session_key", period.sessionKey).maybeSingle();
  if (error) throw new Error("Session could not be loaded. Retry before logging.");
  const { data: last } = await context.supabase.from("guard_trades").select("instrument,account").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const trades = session ? await context.supabase.from("guard_trades").select("*").eq("session_id", session.id).order("created_at") : { data: [], error: null };
  if (trades.error) throw new Error("Trades could not be loaded.");
  const { data: journal, error: journalError } = await context.supabase.from("member_notes").select("body,updated_at").eq("user_id", context.userId).eq("note_date", period.date).eq("session", `${period.period}#guard`).maybeSingle();
  if (journalError) throw new Error("Journal reflection could not be loaded.");
  return { period, session, journal, trades: trades.data ?? [], lastInstrument: last?.instrument ?? "MNQ", lastAccount: last?.account ?? "Default", serverTime: new Date().toISOString() };
});
export const saveGuardTrade = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => guardTradeInput.parse(input)).handler(async ({ context, data }) => {
  if (!(await checkAccess(context)).hasAccess) throw new Error("Centre membership required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: trade, error } = await supabaseAdmin.rpc("commit_guard_trade", { p_user: context.userId, p_id: data.id, p_session: data.sessionKey, p_instrument: data.instrument, p_account: data.account, p_outcome: data.outcome, p_pnl: data.pnl, p_note: data.note, p_direction: data.direction });
  if (error) throw new Error(["Session locked", "Outside trading window", "Session changed; reload before logging", "Submission already used"].includes(error.message) ? error.message : "Trade not confirmed. Retry with the same details.");
  return { saved: true, trade };
});
export const undoGuardTrade = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ context, data }) => {
  if (!(await checkAccess(context)).hasAccess) throw new Error("Centre membership required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("undo_guard_trade", { p_user: context.userId, p_id: data.id });
  if (error) throw new Error("Undo not confirmed; the 15-second window may have ended.");
  return { saved: true };
});
export const setGuardDone = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ sessionKey: z.string().regex(/^\d{4}-\d{2}-\d{2}-(am|pm)$/), revert: z.boolean(), expectedDoneAt: z.string().datetime({ offset: true }).nullable() }).parse(input)).handler(async ({ context, data }) => {
  if (!(await checkAccess(context)).hasAccess) throw new Error("Centre membership required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: session, error } = await supabaseAdmin.rpc("set_guard_done", { p_user: context.userId, p_session: data.sessionKey, p_revert: data.revert, p_expected: data.expectedDoneAt ?? "1970-01-01T00:00:00Z" });
  if (error) throw new Error(error.message.includes("window ended") ? "The five-minute revert window has ended." : "Session lock not confirmed. Reload to check its status.");
  return { saved: true, session };
});
export const saveGuardReflection = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ sessionKey: z.string().regex(/^\d{4}-\d{2}-\d{2}-(am|pm)$/), fields: z.record(z.string().max(8000)), expectedUpdatedAt: z.string().nullable() }).parse(input)).handler(async ({ context, data }) => {
  if (!(await checkAccess(context)).hasAccess) throw new Error("Centre membership required.");
  const { data: session } = await context.supabase.from("guard_sessions").select("period,note_date,locked_at").eq("user_id", context.userId).eq("session_key", data.sessionKey).maybeSingle();
  if (!session?.locked_at) throw new Error("Finish the session before saving its reflection.");
  const key = `${session.period}#guard`;
  const { data: row, error: readError } = await context.supabase.from("member_notes").select("body,updated_at").eq("user_id", context.userId).eq("note_date", session.note_date).eq("session", key).maybeSingle();
  if (readError || !row) throw new Error("Reload the session before saving the reflection.");
  if (row.updated_at !== data.expectedUpdatedAt) throw new Error("Journal changed elsewhere. Reload before saving.");
  const body = JSON.parse(row.body) as Record<string, unknown>;
  for (const field of VOICE_FIELDS) { if (field !== "pnl" && field !== "outcome" && typeof data.fields[field] === "string") body[field] = data.fields[field]; }
  const { data: saved, error } = await context.supabase.rpc("save_journal_entry_confirmed", { p_date: session.note_date, p_old_key: key, p_new_key: key, p_body: JSON.stringify(body), p_expected: row.updated_at });
  if (error || !saved) throw new Error("Reflection not saved. Reload before trying again.");
  return { saved: true };
});