import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getIndicatorWorkspace, submitIndicatorRequest } from "@/lib/indicators.functions";
import { tradingViewUsername } from "@/lib/indicator-rules";
import { IndicatorManager } from "@/components/IndicatorManager";

export function IndicatorRequestForm() {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const fetchWorkspace = useServerFn(getIndicatorWorkspace);
  const submit = useServerFn(submitIndicatorRequest);
  const q = useQuery({ queryKey: ["indicator-workspace", user?.id], queryFn: () => fetchWorkspace(), enabled: !!user, refetchInterval: 15_000, retry: false });
  const [indicatorId, setIndicatorId] = useState("");
  const [username, setUsername] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const submission = useRef<{ key: string; id: string } | null>(null);
  const active = q.data?.indicators.filter((item) => item.active) ?? [];
  const selectedId = active.some((item) => item.id === indicatorId) ? indicatorId : active[0]?.id ?? "";
  const pending = q.data?.requests.find((item) => item.indicator_id === selectedId && item.status === "pending");
  useEffect(() => { setStatus(null); setError(false); }, [selectedId]);
  return <section className="mt-6 border-t border-border pt-5">
    <h3 className="text-sm font-semibold">TradingView access request</h3>
    {q.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading indicators…</p>}
    {q.isError && <div className="mt-3"><p className="text-sm text-destructive">Could not load your requests.</p><Button variant="outline" className="mt-2 rounded-full" onClick={() => q.refetch()}>Retry</Button></div>}
    {q.data && <>
      <form className="mt-4 grid gap-3" onSubmit={async (event) => {
        event.preventDefault(); if (busy || pending || !selectedId) return;
        const parsed = tradingViewUsername.safeParse(username);
        if (!parsed.success) { setError(true); setStatus("Enter a username of 2–60 letters, numbers or underscores, without @ or a link."); return; }
        const key = JSON.stringify([user?.id, selectedId, parsed.data, note.trim()]);
        const storageKey = `shlm.indicator-submission.${user?.id}`;
        if (submission.current?.key !== key) {
          let restored: { key: string; id: string } | null = null;
          try { restored = JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); } catch { /* storage can be restricted */ }
          submission.current = restored?.key === key && typeof restored.id === "string" ? restored : { key, id: crypto.randomUUID() };
          try { sessionStorage.setItem(storageKey, JSON.stringify(submission.current)); } catch { /* in-memory identity still protects this retry */ }
        }
        setBusy(true); setStatus(null); setError(false);
        try {
          const result = await submit({ data: { indicatorId: selectedId, username: parsed.data, note: note.trim(), submissionId: submission.current.id } });
          if (result.saved) {
            setStatus(result.request.notification_status === "sent" ? "Request saved. Awaiting review; TradingView access is not granted automatically." : "Request saved and visible to the Founder. Email notification is not confirmed.");
            await Promise.all([qc.invalidateQueries({ queryKey: ["indicator-workspace"] }), qc.invalidateQueries({ queryKey: ["indicator-admin"] })]);
          }
        } catch (failure) { setError(true); setStatus(failure instanceof Error ? failure.message : "Save not confirmed. Please retry."); }
        finally { setBusy(false); }
      }}>
        <label className="grid gap-2 text-sm">Indicator<select aria-label="Indicator" className="min-h-11 w-full rounded-full border border-input bg-background px-4 text-base sm:text-sm" disabled={busy || active.length === 0} value={selectedId} onChange={(event) => setIndicatorId(event.target.value)}>{active.length === 0 && <option value="">No active indicators</option>}{active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {active.find((item) => item.id === selectedId)?.description && <p className="text-xs text-muted-foreground">{active.find((item) => item.id === selectedId)?.description}</p>}
        <label className="grid gap-2 text-sm">TradingView username<Input required minLength={2} maxLength={60} autoComplete="off" value={username} disabled={busy || !!pending} onChange={(event) => setUsername(event.target.value)} /></label>
        <label className="grid gap-2 text-sm">Note <span className="text-xs text-muted-foreground">Optional</span><Textarea maxLength={500} value={note} disabled={busy || !!pending} onChange={(event) => setNote(event.target.value)} /></label>
        <Button type="submit" className="min-h-11 rounded-full" disabled={busy || !!pending || !selectedId}>{busy ? "Saving…" : pending ? "Request pending" : "Send TradingView Username"}</Button>
        {pending && <p className="text-xs text-muted-foreground">Pending for {pending.tradingview_username} · {new Date(pending.created_at).toLocaleDateString()}</p>}
        {status && <p role={error ? "alert" : "status"} className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>{status}</p>}
      </form>
      {q.data.isOwner && <IndicatorManager compact />}
      {q.data.requests.length > 0 && <div className="mt-6"><h4 className="text-sm font-medium">Your requests</h4><ul className="mt-2 divide-y divide-border">{q.data.requests.map((request) => <li key={request.id} className="py-3 text-xs"><p className="break-words font-medium">{request.indicator_name} · {request.tradingview_username}</p><p className="mt-1 capitalize text-muted-foreground">{request.status} · {new Date(request.created_at).toLocaleString()}</p></li>)}</ul></div>}
    </>}
  </section>;
}