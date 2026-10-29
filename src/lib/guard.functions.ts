import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkAccess } from "@/lib/hub.functions";
import { guardPeriod, guardTradeInput } from "@/lib/guard-rules";

export const getGuard = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!(await checkAccess(context)).hasAccess) throw new Error("Centre membership required.");
  const period = guardPeriod(new Date());
  const { data: session, error } = await context.supabase.from("guard_sessions").select("*").eq("user_id", context.userId).eq("session_key", period.sessionKey).maybeSingle();
  if (error) throw new Error("Session could not be loaded. Retry before logging.");
  const { data: last } = await context.supabase.from("guard_trades").select("instrument,account").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const trades = session ? await context.supabase.from("guard_trades").select("*").eq("session_id", session.id).order("created_at") : { data: [], error: null };
  if (trades.error) throw new Error("Trades could not be loaded.");
  return { period, session, trades: trades.data ?? [], lastInstrument: last?.instrument ?? "MNQ", lastAccount: last?.account ?? "Default", serverTime: new Date().toISOString() };
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