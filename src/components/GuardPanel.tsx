import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getGuard, saveGuardTrade, undoGuardTrade } from "@/lib/guard.functions";
import { guardTradeInput } from "@/lib/guard-rules";
import type { z } from "zod";

type Pending = z.infer<typeof guardTradeInput>;
export function GuardPanel({ userId }: { userId: string }) {
  const load = useServerFn(getGuard), save = useServerFn(saveGuardTrade), undo = useServerFn(undoGuardTrade);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["guard", userId], queryFn: () => load(), retry: false, refetchInterval: 5000 });
  const [draft, setDraft] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [now, setNow] = useState(0);
  const [pending, setPending] = useState(false);
  const storageKey = `shlm.guard.pending.${userId}`;
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    try { const raw = localStorage.getItem(storageKey); if (raw) { const parsed = guardTradeInput.safeParse(JSON.parse(raw)); if (parsed.success) { setPending(true); setDraft(parsed.data); setMessage("Unconfirmed trade restored. Retry to check its saved status."); } } } catch { setError("Recovery storage could not be read."); }
    const channel = supabase.channel(`guard-${userId}-${crypto.randomUUID()}`).on("postgres_changes", { event: "*", schema: "public", table: "guard_sessions", filter: `user_id=eq.${userId}` }, () => qc.invalidateQueries({ queryKey: ["guard", userId] })).subscribe();
    return () => { clearInterval(timer); void supabase.removeChannel(channel); };
  }, [userId, qc, storageKey]);
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["guard", userId] }), qc.invalidateQueries({ queryKey: ["member-notes-range", userId] }), qc.invalidateQueries({ queryKey: ["member-notes-summary", userId] })]); };
  const submit = async () => {
    if (!draft || busy) return;
    const parsed = guardTradeInput.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check trade details."); return; }
    try { localStorage.setItem(storageKey, JSON.stringify(parsed.data)); } catch { setError("Recovery storage is blocked. No trade sent."); return; }
    setPending(true);
    setBusy(true); setError("");
    try { await save({ data: parsed.data }); localStorage.removeItem(storageKey); setPending(false); setDraft(null); setMessage("Saved to Guard and Journal."); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Trade not confirmed. Retry with the same details."); await refresh(); }
    finally { setBusy(false); }
  };
  const begin = (outcome: Pending["outcome"]) => {
    if (!q.data) return;
    setError(""); setMessage(""); setDraft({ id: crypto.randomUUID(), sessionKey: q.data.period.sessionKey, instrument: q.data.lastInstrument as Pending["instrument"], account: q.data.lastAccount, outcome, pnl: 0, note: "", direction: "" });
  };
  if (q.isError) return <div role="alert" className="py-5 text-sm text-destructive">{q.error.message}<Button variant="outline" className="ml-3 rounded-full" onClick={() => q.refetch()}>Retry</Button></div>;
  if (!q.data) return <p className="py-8 text-sm text-muted-foreground">Loading session…</p>;
  const active = q.data.trades.filter(t => !t.undone_at), last = q.data.trades.at(-1);
  const locked = !!q.data.session?.locked_at;
  const total = active.reduce((sum, t) => sum + Number(t.pnl), 0);
  const undoable = !!last && !last.undone_at && now - Date.parse(last.created_at) < 15000;
  return <section className="space-y-5 py-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-medium">Session Guard</h2><p className="mt-1 text-xs text-muted-foreground">{q.data.period.date} · {q.data.period.period === "gold" ? "Evening" : "NY Open"} · Pacific</p></div><span className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">{locked ? <Lock size={14} /> : <Check size={14} />}{locked ? "Session finalized" : q.data.period.windowOpen ? "Open" : "Outside trading window"}</span></div>
    <div className="grid grid-cols-4 gap-2 border-y border-border py-5">{[["Trades", `${active.length}/3`], ["P&L", `$${total.toFixed(2)}`], ["W / L / BE", `${active.filter(t => t.outcome === "win").length} / ${active.filter(t => t.outcome === "loss").length} / ${active.filter(t => t.outcome === "breakeven").length}`], ["Lock", q.data.session?.lock_reason === "one-win" ? "One win" : locked ? "3 trades" : "—"]].map(([label,value]) => <div key={label}><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-2 break-words font-display text-base font-medium">{value}</p></div>)}</div>
    {!locked && active.filter(t => t.outcome === "loss").length >= 2 && <p className="text-sm">Two losses. A+ only on the final trade.</p>}
    {locked && <p className="text-sm text-muted-foreground">{q.data.session?.lock_reason === "one-win" ? "Win recorded. Done for this session." : "Three trades recorded. Session complete."} {q.data.session?.locked_at && new Date(q.data.session.locked_at).toLocaleTimeString()} · Next reset {q.data.period.period === "gold" ? "6:15 AM" : "4:50 PM"} Pacific.</p>}
    <div className="flex flex-wrap gap-2">{(["win", "loss", "breakeven"] as const).map(outcome => <Button key={outcome} className="rounded-full" variant={outcome === "win" ? "default" : "outline"} disabled={locked || !q.data?.period.windowOpen || busy || !!draft} onClick={() => begin(outcome)}>{outcome === "breakeven" ? "BREAKEVEN" : outcome.toUpperCase()}</Button>)}<Button size="icon" variant="ghost" title="Undo latest trade within 15 seconds" aria-label="Undo latest trade" disabled={!undoable || busy} onClick={async () => { if (!last) return; setBusy(true); try { await undo({ data: { id: last.id } }); setMessage("Undo saved to Guard and Journal."); await refresh(); } catch(e) { setError(e instanceof Error ? e.message : "Undo failed."); } finally { setBusy(false); } }}><RotateCcw /></Button></div>
    {(message || error) && <p role={error ? "alert" : "status"} className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>{error || message}</p>}
    <ul className="divide-y divide-border">{q.data.trades.map(t => <li key={t.id} className={`flex flex-wrap justify-between gap-2 py-3 text-sm ${t.undone_at ? "text-muted-foreground line-through" : ""}`}><span>{t.instrument} · {t.account} · {t.outcome.toUpperCase()}</span><span>${Number(t.pnl).toFixed(2)} · {new Date(t.occurred_at).toLocaleTimeString()}</span></li>)}</ul>
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !busy && !localStorage.getItem(storageKey)) setDraft(null); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{draft?.outcome.toUpperCase()} · Log trade</DialogTitle></DialogHeader>{draft && <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm">Market<select className="h-10 rounded-md border border-input bg-background px-3" value={draft.instrument} disabled={busy || pending} onChange={event => setDraft({ ...draft, instrument: event.target.value as Pending["instrument"] })}>{["NQ","MNQ","YM","MYM","GC","MGC"].map(m => <option key={m}>{m}</option>)}</select></label><label className="grid gap-2 text-sm">Account<Input maxLength={100} value={draft.account} disabled={busy || pending} onChange={event => setDraft({ ...draft, account: event.target.value })} /></label></div>
      <label className="grid gap-2 text-sm">Net P&L ($)<Input type="number" step="0.01" value={draft.pnl} disabled={busy || pending} onChange={event => setDraft({ ...draft, pnl: Number(event.target.value) })} /></label>
      <label className="grid gap-2 text-sm">Note (optional)<Textarea maxLength={2000} value={draft.note} disabled={busy || pending} onChange={event => setDraft({ ...draft, note: event.target.value })} /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="rounded-full" disabled={busy}>{busy ? "Confirming save…" : error ? "Retry same trade" : "Save trade"}</Button>
      {!busy && <Button type="button" variant="ghost" onClick={() => { if (!localStorage.getItem(storageKey) || window.confirm("This trade is unconfirmed. Discarding the recovery copy does not delete a trade that already saved. Check Guard before logging it again.")) { localStorage.removeItem(storageKey); setPending(false); setDraft(null); setError(""); } }}>Cancel</Button>}
    </form>}</DialogContent></Dialog>
  </section>;
}