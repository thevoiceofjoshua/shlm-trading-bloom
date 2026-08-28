import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { HubPayload } from "@/lib/hub.functions";
import { getMemberNotes, saveMemberNote } from "@/lib/hub.functions";
import { econTimeToLocal } from "@/lib/hub-session";

export function EconomicCalendar({ payload }: { payload: HubPayload }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const events = [...payload.econEvents].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // Next upcoming release
  const next = events.find((e) => e.date + e.time >= todayStr);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-medium">Economic calendar</h3>
        {next && (
          <span className="text-xs text-muted-foreground">
            Next: {next.title} — {econTimeToLocal(next.date, next.time)} your time
          </span>
        )}
      </div>

      {/* Heads up banner if a high-impact release lands in a trading window */}
      {events.some((e) => e.impact === "high" && e.date === todayStr) && (
        <div className="mt-3 rounded-lg border border-foreground/30 bg-surface px-4 py-2.5 text-xs text-foreground">
          ⚠ Heads up: a high-impact release lands today — check if it falls inside your trading window.
        </div>
      )}

      <div className="mt-4 divide-y divide-border">
        {events.map((e, i) => {
          const localTime = econTimeToLocal(e.date, e.time);
          const dateLabel = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          return (
            <div key={i} className="flex items-center justify-between py-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-medium tabular-nums">{localTime}</span>
                <span className="text-muted-foreground">{dateLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{e.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                    e.impact === "high"
                      ? "bg-foreground text-background"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {e.impact}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------- Bias journal ----------------------- */

export function BiasJournal({ userId }: { userId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [body, setBody] = useState("");
  const [session, setSession] = useState("ny-open");
  const [loaded, setLoaded] = useState(false);

  const fetchNotes = useServerFn(getMemberNotes);
  const saveNote = useServerFn(saveMemberNote);

  const { refetch } = useQuery({
    queryKey: ["member-notes", userId, today],
    queryFn: async () => {
      const rows = await fetchNotes({ data: { noteDate: today } });
      const existing = rows.find((r: any) => r.session === session);
      if (existing) setBody(existing.body);
      setLoaded(true);
      return rows;
    },
    enabled: !!userId,
  });

  const save = useMutation({
    mutationFn: () => saveNote({ data: { noteDate: today, session, body } }),
    onSuccess: () => refetch(),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-medium">Trading notes / bias journal</h3>
      <p className="mt-1 text-xs text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>

      <div className="mt-4 flex gap-2">
        {[
          { key: "ny-open", label: "NY Open" },
          { key: "gold", label: "Gold Session" },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setSession(s.key);
              setBody("");
              refetch();
            }}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              session === s.key ? "border-foreground bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-accent"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Log your bias, key levels, and plan for this session…"
        className="mt-4 min-h-32 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {save.isPending ? "Saving…" : "Save note"}
      </button>
      {save.isSuccess && <p className="mt-2 text-xs text-muted-foreground">Saved to your account.</p>}
    </div>
  );
}
