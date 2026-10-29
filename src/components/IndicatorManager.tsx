import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Archive, Check, ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getIndicatorAdministration, reorderIndicatorCatalogue, reviewIndicatorRequest, saveIndicator, type Indicator } from "@/lib/indicators.functions";
import { INDICATOR_OWNER_ID } from "@/lib/indicator-rules";

export function IndicatorManager({ compact = false }: { compact?: boolean }) {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Partial<Indicator> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const getAdmin = useServerFn(getIndicatorAdministration);
  const save = useServerFn(saveIndicator);
  const reorder = useServerFn(reorderIndicatorCatalogue);
  const review = useServerFn(reviewIndicatorRequest);
  const q = useQuery({ queryKey: ["indicator-admin", user?.id, page], queryFn: () => getAdmin({ data: { page } }), enabled: user?.id === INDICATOR_OWNER_ID, retry: false, refetchInterval: 15_000 });
  const mutation = useMutation({
    mutationFn: async (action: { type: "save"; indicator: Partial<Indicator> } | { type: "order"; ids: string[] } | { type: "review"; id: string; status: "approved" | "rejected" }) => {
      if (action.type === "save") await save({ data: { id: action.indicator.id, name: action.indicator.name ?? "", description: action.indicator.description ?? "", active: action.indicator.active ?? true, expectedUpdatedAt: action.indicator.updated_at } });
      if (action.type === "order") await reorder({ data: { ids: action.ids } });
      if (action.type === "review") await review({ data: { id: action.id, status: action.status } });
    },
    onSuccess: async () => {
      setEditing(null); setMessage("Saved.");
      await Promise.all([qc.invalidateQueries({ queryKey: ["indicator-admin"] }), qc.invalidateQueries({ queryKey: ["indicator-workspace"] })]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Not saved. Please retry."),
  });
  if (!user || user.id !== INDICATOR_OWNER_ID || q.isError) return null;
  if (!q.data) return compact ? null : <p className="mt-8 text-sm text-muted-foreground">Loading indicators…</p>;
  const move = (index: number, delta: number) => {
    const ids = q.data?.indicators.map((indicator) => indicator.id) ?? [];
    const first = ids[index]; const second = ids[index + delta];
    if (!first || !second) return;
    ids[index] = second; ids[index + delta] = first;
    mutation.mutate({ type: "order", ids });
  };
  return (
    <section className={compact ? "mt-4" : "mt-12 border-t border-border pt-8"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!compact && <h2 className="font-display text-xl font-medium">Indicators <span className="ml-2 text-sm text-muted-foreground">{q.data.pending} pending</span></h2>}
        <Button variant="outline" className="rounded-full" onClick={() => { setMessage(null); setEditing({ name: "", description: "", active: true }); }}><Plus /> Add Indicator</Button>
      </div>
      {message && <p role="status" className={`mt-3 text-sm ${mutation.isError ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}
      {!compact && <>
        <ul className="mt-4 divide-y divide-border">
          {q.data.indicators.map((indicator, index) => <li key={indicator.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="break-words text-sm font-medium">{indicator.name}{!indicator.active && <span className="ml-2 text-xs text-muted-foreground">Archived</span>}</p>{indicator.description && <p className="mt-1 break-words text-xs text-muted-foreground">{indicator.description}</p>}</div>
            <div className="flex shrink-0 gap-1">
              <Button size="icon" variant="ghost" title="Move up" aria-label={`Move ${indicator.name} up`} disabled={index === 0 || mutation.isPending} onClick={() => move(index, -1)}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" title="Move down" aria-label={`Move ${indicator.name} down`} disabled={index === q.data.indicators.length - 1 || mutation.isPending} onClick={() => move(index, 1)}><ArrowDown /></Button>
              <Button size="icon" variant="ghost" title="Edit indicator" aria-label={`Edit ${indicator.name}`} disabled={mutation.isPending} onClick={() => { setMessage(null); setEditing(indicator); }}><Pencil /></Button>
              <Button size="icon" variant="ghost" title={indicator.active ? "Archive" : "Restore"} aria-label={`${indicator.active ? "Archive" : "Restore"} ${indicator.name}`} disabled={mutation.isPending} onClick={() => mutation.mutate({ type: "save", indicator: { ...indicator, active: !indicator.active } })}>{indicator.active ? <Archive /> : <RotateCcw />}</Button>
            </div>
          </li>)}
        </ul>
        <h3 className="mt-8 font-display text-lg font-medium">TradingView requests</h3>
        {q.data.requests.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No requests yet.</p>}
        <ul className="mt-3 divide-y divide-border">
          {q.data.requests.map((request) => <li key={request.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0"><p className="break-words text-sm font-medium">{request.member_name || request.member_email}</p><p className="break-words text-xs text-muted-foreground">{request.member_email}</p><p className="mt-1 break-words text-sm">{request.tradingview_username} · {request.indicator_name}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{request.status} · {new Date(request.created_at).toLocaleString()} · Email {request.notification_status}</p>{request.note && <p className="mt-1 break-words text-xs text-muted-foreground">{request.note}</p>}</div>
            {request.status === "pending" && <div className="flex items-start gap-2"><Button variant="outline" className="rounded-full" disabled={mutation.isPending} onClick={() => { if (window.confirm("Mark approved after manually granting this username access on TradingView?")) mutation.mutate({ type: "review", id: request.id, status: "approved" }); }}><Check />Approve</Button><Button variant="ghost" className="rounded-full" disabled={mutation.isPending} onClick={() => mutation.mutate({ type: "review", id: request.id, status: "rejected" })}><X />Reject</Button></div>}
          </li>)}
        </ul>
        <div className="mt-4 flex items-center gap-3"><Button size="icon" variant="outline" className="rounded-full" aria-label="Previous requests" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button><span className="text-xs text-muted-foreground">{page + 1} / {Math.max(1, Math.ceil(q.data.total / 25))}</span><Button size="icon" variant="outline" className="rounded-full" aria-label="Next requests" disabled={(page + 1) * 25 >= q.data.total} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button></div>
      </>}
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open && !mutation.isPending) setEditing(null); }}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?.id ? "Edit indicator" : "Add Indicator"}</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (editing && !mutation.isPending) mutation.mutate({ type: "save", indicator: editing }); }}>
            <label className="grid gap-2 text-sm">Name<Input autoFocus required maxLength={100} value={editing?.name ?? ""} onChange={(event) => setEditing((old) => ({ ...old, name: event.target.value }))} /></label>
            <label className="grid gap-2 text-sm">Description<Textarea maxLength={500} value={editing?.description ?? ""} onChange={(event) => setEditing((old) => ({ ...old, description: event.target.value }))} /></label>
            {mutation.isError && <p role="alert" className="text-sm text-destructive">{message}</p>}
            <Button type="submit" className="rounded-full" disabled={mutation.isPending || !editing?.name?.trim()}>{mutation.isPending ? "Saving…" : "Save indicator"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}