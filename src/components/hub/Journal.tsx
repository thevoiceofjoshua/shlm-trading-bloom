import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getMemberNotesRange, saveMemberNote } from "@/lib/hub.functions";

/* ------------------------------ date helpers ------------------------------- */

function toKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function monthMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const SESSION_TABS = [
  { key: "ny-open", label: "NY Open" },
  { key: "gold", label: "Gold Session" },
];

/* ------------------------------ entry model ------------------------------- */

interface Entry {
  bias: string;
  levels: string;
  wentWell: string;
  wentWrong: string;
  emotion: string;
  outcome: string;
  rule: string;
  notes: string;
}

const EMPTY: Entry = { bias: "", levels: "", wentWell: "", wentWrong: "", emotion: "", outcome: "", rule: "", notes: "" };

const BIASES = [
  { key: "long", label: "📈 Long" },
  { key: "short", label: "📉 Short" },
  { key: "neutral", label: "➖ Neutral" },
];
const EMOTIONS = [
  { key: "calm", label: "😌 Calm" },
  { key: "anxious", label: "😬 Anxious" },
  { key: "frustrated", label: "😤 Frustrated" },
  { key: "overconfident", label: "🤩 Overconfident" },
  { key: "flat", label: "😐 Flat" },
];
const OUTCOMES = [
  { key: "green", label: "🟢 Green" },
  { key: "red", label: "🔴 Red" },
  { key: "breakeven", label: "⚪ Breakeven" },
  { key: "none", label: "🚫 No trade" },
];

function parseEntry(body: string): Entry {
  if (!body) return { ...EMPTY };
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ...EMPTY, ...(parsed as Partial<Entry>) };
    }
  } catch {
    /* legacy plain-text note */
  }
  return { ...EMPTY, notes: body };
}

function isFilled(e: Entry): boolean {
  return Object.values(e).some((v) => v.trim() !== "");
}

/* -------------------------------- component ------------------------------- */

export function Journal({ userId }: { userId: string }) {
  const todayKey = toKey(new Date());
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selected, setSelected] = useState(todayKey);
  const [session, setSession] = useState("ny-open");
  const [entry, setEntry] = useState<Entry>({ ...EMPTY });
  const [dirty, setDirty] = useState(false);

  const fetchRange = useServerFn(getMemberNotesRange);
  const saveNote = useServerFn(saveMemberNote);

  const from = toKey(new Date(cursor.year, cursor.month, 1));
  const to = toKey(new Date(cursor.year, cursor.month + 1, 0));

  const { data: rows, refetch } = useQuery({
    queryKey: ["member-notes-range", userId, from, to],
    queryFn: () => fetchRange({ data: { from, to } }),
    enabled: !!userId,
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const r of (rows ?? []) as { note_date: string; session: string; body: string }[]) {
      if (!map.has(r.note_date)) map.set(r.note_date, new Map());
      map.get(r.note_date)!.set(r.session, r.body ?? "");
    }
    return map;
  }, [rows]);

  // Load the entry for the selected day + session whenever either changes.
  useEffect(() => {
    const body = byDay.get(selected)?.get(session) ?? "";
    setEntry(parseEntry(body));
    setDirty(false);
  }, [selected, session, byDay]);

  const save = useMutation({
    mutationFn: () => saveNote({ data: { noteDate: selected, session, body: JSON.stringify(entry) } }),
    onSuccess: () => {
      setDirty(false);
      refetch();
    },
  });

  const set = <K extends keyof Entry>(key: K, value: string) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const cells = monthMatrix(cursor.year, cursor.month);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedLabel = (() => {
    const [y, m, d] = selected.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  })();

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-medium">Trading journal</h3>
        <p className="text-xs text-muted-foreground">Pick a date, log the session.</p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Calendar */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm text-foreground transition-colors hover:bg-accent"
            >
              ‹
            </button>
            <p className="font-display text-sm font-medium">{monthLabel}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const n = new Date();
                  setCursor({ year: n.getFullYear(), month: n.getMonth() });
                  setSelected(toKey(n));
                }}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm text-foreground transition-colors hover:bg-accent"
              >
                ›
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="pb-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="h-11" />;
              const key = toKey(d);
              const isSelected = key === selected;
              const isToday = key === todayKey;
              const filled = Array.from(byDay.get(key)?.values() ?? []).some((b) => isFilled(parseEntry(b)));
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`relative flex h-11 min-w-11 flex-col items-center justify-center rounded-xl border text-sm transition-colors ${
                    isSelected
                      ? "border-foreground bg-primary font-medium text-primary-foreground"
                      : isToday
                        ? "border-foreground/60 bg-background text-foreground hover:bg-accent"
                        : "border-transparent bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {d.getDate()}
                  {filled && (
                    <span
                      className={`absolute bottom-1.5 h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-foreground"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            <span className="mr-1 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-foreground" /> day has a saved entry
          </p>
        </div>

        {/* Entry */}
        <div className="min-w-0">
          <p className="font-display text-sm font-medium">{selectedLabel}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {SESSION_TABS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSession(s.key)}
                className={`min-h-9 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  session === s.key
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            <PillField label="🎯 Bias" options={BIASES} value={entry.bias} onChange={(v) => set("bias", v)} />

            <TextField
              label="📊 Key levels I watched"
              placeholder="e.g. Yesterday high 20,410 / pre-market low 20,180"
              value={entry.levels}
              onChange={(v) => set("levels", v)}
            />
            <TextField label="✅ What I executed well" placeholder="Waited for confirmation before entry…" value={entry.wentWell} onChange={(v) => set("wentWell", v)} rows={2} />
            <TextField label="⚠️ What went wrong" placeholder="Chased the second entry after the news spike…" value={entry.wentWrong} onChange={(v) => set("wentWrong", v)} rows={2} />

            <PillField label="🧠 How I felt during the session" options={EMOTIONS} value={entry.emotion} onChange={(v) => set("emotion", v)} />
            <PillField label="📈 Session outcome" options={OUTCOMES} value={entry.outcome} onChange={(v) => set("outcome", v)} />

            <TextField label="📝 One rule for tomorrow" placeholder="No entries in the first 5 minutes of the open." value={entry.rule} onChange={(v) => set("rule", v)} />
            <TextField label="🗒️ Free notes" placeholder="Anything else worth remembering about this session…" value={entry.notes} onChange={(v) => set("notes", v)} rows={4} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => save.mutate()}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save entry"}
            </button>
            {dirty ? (
              <p className="text-xs text-muted-foreground">Unsaved changes</p>
            ) : save.isSuccess ? (
              <p className="text-xs text-muted-foreground">Saved to your account.</p>
            ) : null}
            {save.isError && <p className="text-xs text-destructive">Couldn’t save. Try again.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- fields --------------------------------- */

function PillField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(value === o.key ? "" : o.key)}
            className={`min-h-10 rounded-full border px-4 text-xs font-medium transition-colors ${
              value === o.key
                ? "border-foreground bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-accent"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
  rows = 1,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
