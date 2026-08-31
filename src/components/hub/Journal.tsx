import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getMemberNotesRange,
  saveMemberNote,
  deleteMemberNote,
  getMemberRules,
  saveMemberRules,
  type MemberRule,
} from "@/lib/hub.functions";
import { supabase } from "@/integrations/supabase/client";

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
const SESSIONS = [
  { key: "ny-open", label: "NY Open" },
  { key: "gold", label: "Asia Session" },
];

function sessionLabel(key: string): string {
  return SESSIONS.find((s) => s.key === key)?.label ?? "Session";
}

/* ------------------------------ entry model ------------------------------- */

interface Trade {
  id: string;
  instrument: string;
  direction: string; // "long" | "short" | ""
  result: string; // "win" | "loss" | "breakeven" | ""
  pnl: string; // signed value, e.g. "-120"
  note: string;
}

interface Shot {
  path: string;
}

interface Entry {
  session: string;
  pnl: string;
  tradeCount: string;
  trades: Trade[];
  screenshots: Shot[];
  bias: string;
  levels: string;
  wentWell: string;
  wentWrong: string;
  emotion: string;
  outcome: string;
  rule: string;
  notes: string;
  ruleChecks: Record<string, "followed" | "broken">;
  consequenceAcknowledged: boolean;
}

const EMPTY: Entry = {
  session: "ny-open",
  pnl: "",
  tradeCount: "",
  trades: [],
  screenshots: [],
  bias: "",
  levels: "",
  wentWell: "",
  wentWrong: "",
  emotion: "",
  outcome: "",
  rule: "",
  notes: "",
  ruleChecks: {},
  consequenceAcknowledged: false,
};

const DIRECTIONS = [
  { key: "long", label: "📈 Long" },
  { key: "short", label: "📉 Short" },
];
const RESULTS = [
  { key: "win", label: "🟢 Win" },
  { key: "loss", label: "🔴 Loss" },
  { key: "breakeven", label: "⚪ BE" },
];

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

interface StoredEntry {
  storageKey: string; // value of member_notes.session
  slot: string;
  entry: Entry;
}

function parseEntry(body: string, storageKey: string): Entry {
  const fallbackSession = storageKey.split("#")[0] || "ny-open";
  const base: Entry = { ...EMPTY, session: fallbackSession, ruleChecks: {}, trades: [], screenshots: [] };
  if (!body) return base;
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const p = parsed as Partial<Entry>;
      return {
        ...base,
        ...p,
        session: typeof p.session === "string" && p.session ? p.session : fallbackSession,
        tradeCount: typeof p.tradeCount === "string" ? p.tradeCount : "",
        trades: Array.isArray(p.trades) ? (p.trades as Trade[]) : [],
        screenshots: Array.isArray(p.screenshots) ? (p.screenshots as Shot[]) : [],
        ruleChecks: (p.ruleChecks ?? {}) as Record<string, "followed" | "broken">,
        consequenceAcknowledged: !!p.consequenceAcknowledged,
      };
    }
  } catch {
    /* legacy plain-text note */
  }
  return { ...base, notes: body };
}

function toNumber(value: string): number {
  const n = Number.parseFloat((value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function tradesWithPnl(entry: Entry): Trade[] {
  return (entry.trades ?? []).filter((t) => t.pnl.replace(/[^0-9.]/g, "") !== "");
}

/** Effective PnL: sum of trade rows when any trade carries a number, otherwise the entry field. */
function pnlNumber(entry: Entry): number {
  const withPnl = tradesWithPnl(entry);
  if (withPnl.length > 0) return withPnl.reduce((sum, t) => sum + toNumber(t.pnl), 0);
  return toNumber(entry.pnl);
}

function hasPnl(entry: Entry): boolean {
  if (tradesWithPnl(entry).length > 0) return true;
  return entry.pnl.trim() !== "" && Number.isFinite(Number.parseFloat(entry.pnl.replace(/[^0-9.-]/g, "")));
}

function newTrade(): Trade {
  return { id: Math.random().toString(36).slice(2, 10), instrument: "", direction: "", result: "", pnl: "", note: "" };
}

function formatMoney(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const body = abs >= 1000 ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : `${Math.round(abs * 100) / 100}`;
  return `${sign}$${body}`;
}

function tradeCountLabel(entry: Entry): string {
  const count = entry.trades?.length ?? 0;
  if (count === 0) return "No trades";
  return `${count} trade${count === 1 ? "" : "s"}`;
}

function brokenRules(entry: Entry, rules: MemberRule[]): MemberRule[] {
  return rules.filter((r) => entry.ruleChecks[r.id] === "broken");
}

function newSlot(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* -------------------------------- component ------------------------------- */

export function Journal({ userId, onClose }: { userId: string; onClose?: () => void }) {
  const todayKey = toKey(new Date());
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selected, setSelected] = useState(todayKey);
  const [editing, setEditing] = useState<StoredEntry | null>(null);
  const [dirty, setDirty] = useState(false);
  const [alertFor, setAlertFor] = useState<MemberRule[] | null>(null);
  const [editingRules, setEditingRules] = useState(false);

  const fetchRange = useServerFn(getMemberNotesRange);
  const saveNote = useServerFn(saveMemberNote);
  const removeNote = useServerFn(deleteMemberNote);
  const fetchRules = useServerFn(getMemberRules);

  const from = toKey(new Date(cursor.year, cursor.month, 1));
  const to = toKey(new Date(cursor.year, cursor.month + 1, 0));

  const { data: rows, refetch } = useQuery({
    queryKey: ["member-notes-range", userId, from, to],
    queryFn: () => fetchRange({ data: { from, to } }),
    enabled: !!userId,
  });

  const { data: rulebook, refetch: refetchRules, isLoading: rulesLoading } = useQuery({
    queryKey: ["member-rules", userId],
    queryFn: () => fetchRules(),
    enabled: !!userId,
  });

  const rules: MemberRule[] = rulebook?.rules ?? [];
  const consequence = rulebook?.consequence ?? "";

  const byDay = useMemo(() => {
    const map = new Map<string, StoredEntry[]>();
    for (const r of (rows ?? []) as { note_date: string; session: string; body: string }[]) {
      const storageKey = r.session;
      const slot = storageKey.includes("#") ? storageKey.split("#")[1]! : storageKey;
      const list = map.get(r.note_date) ?? [];
      list.push({ storageKey, slot, entry: parseEntry(r.body ?? "", storageKey) });
      map.set(r.note_date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.storageKey.localeCompare(b.storageKey));
    return map;
  }, [rows]);

  const dayTotals = useMemo(() => {
    const map = new Map<string, { total: number; hasAny: boolean; hasPnl: boolean }>();
    for (const [date, list] of byDay) {
      const total = list.reduce((sum, e) => sum + pnlNumber(e.entry), 0);
      map.set(date, { total, hasAny: list.length > 0, hasPnl: list.some((e) => hasPnl(e.entry)) });
    }
    return map;
  }, [byDay]);

  // Close the editor when the selected day changes.
  useEffect(() => {
    setEditing(null);
    setDirty(false);
  }, [selected]);

  const save = useMutation({
    mutationFn: async (target: StoredEntry) => {
      const desiredKey = `${target.entry.session}#${target.slot}`;
      await saveNote({ data: { noteDate: selected, session: desiredKey, body: JSON.stringify(target.entry) } });
      if (target.storageKey && target.storageKey !== desiredKey) {
        try {
          await removeNote({ data: { noteDate: selected, session: target.storageKey } });
        } catch {
          /* old row may not exist yet */
        }
      }
      return desiredKey;
    },
    onSuccess: async (desiredKey, target) => {
      setDirty(false);
      setEditing({ ...target, storageKey: desiredKey });
      await refetch();
      const broken = brokenRules(target.entry, rules);
      if (broken.length > 0 && consequence && !target.entry.consequenceAcknowledged) setAlertFor(broken);
    },
  });

  const del = useMutation({
    mutationFn: async (target: StoredEntry) => {
      if (!target.storageKey) return { deleted: true };
      return removeNote({ data: { noteDate: selected, session: target.storageKey } });
    },

    onSuccess: async () => {
      setEditing(null);
      setDirty(false);
      await refetch();
    },
  });

  const setField = <K extends keyof Entry>(key: K, value: Entry[K]) => {
    setEditing((prev) => (prev ? { ...prev, entry: { ...prev.entry, [key]: value } } : prev));
    setDirty(true);
  };

  const cells = monthMatrix(cursor.year, cursor.month);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedLabel = (() => {
    const [y, m, d] = selected.split("-").map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  })();

  const dayEntries = byDay.get(selected) ?? [];
  const dayTotal = dayEntries.reduce((sum, e) => sum + pnlNumber(e.entry), 0);
  const takenSessions = new Set(dayEntries.map((e) => e.entry.session));

  const needsSetup = !rulesLoading && !(rulebook?.configured ?? false);

  if (needsSetup || editingRules) {
    return (
      <RulesSetup
        initialRules={rules}
        initialConsequence={consequence}
        firstTime={needsSetup}
        onDone={async () => {
          await refetchRules();
          setEditingRules(false);
        }}
        onCancel={needsSetup ? undefined : () => setEditingRules(false)}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-medium">Trading journal</h3>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">Pick a date, log every session.</p>
          <button
            type="button"
            onClick={() => setEditingRules(true)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            Edit my rules
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close journal"
              className="flex size-8 items-center justify-center rounded-full border border-border text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      </div>


      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
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
              if (!d) return <div key={i} className="h-16" />;
              const key = toKey(d);
              const isSelected = key === selected;
              const isToday = key === todayKey;
              const info = dayTotals.get(key);
              const tint =
                info?.hasPnl && info.total > 0
                  ? "bg-emerald-500/15"
                  : info?.hasPnl && info.total < 0
                    ? "bg-red-500/15"
                    : "bg-background";
              const pnlColor = (info?.total ?? 0) > 0 ? "text-emerald-500" : (info?.total ?? 0) < 0 ? "text-red-500" : "text-muted-foreground";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`relative flex h-16 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm transition-colors ${tint} ${
                    isSelected
                      ? "border-foreground ring-1 ring-foreground"
                      : isToday
                        ? "border-foreground/60"
                        : "border-transparent hover:bg-accent"
                  }`}
                >
                  <span className={isSelected ? "font-semibold" : ""}>{d.getDate()}</span>
                  {info?.hasPnl ? (
                    <span className={`text-[10px] font-medium tabular-nums ${pnlColor}`}>{formatMoney(info.total)}</span>
                  ) : info?.hasAny ? (
                    <span className="h-1 w-1 rounded-full bg-foreground" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
            <p>
              <span className="mr-1 inline-block h-2 w-2 translate-y-[1px] rounded-sm bg-emerald-500/40" /> profit day
              <span className="ml-3 mr-1 inline-block h-2 w-2 translate-y-[1px] rounded-sm bg-red-500/40" /> loss day
            </p>
            <p>
              <span className="mr-1 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-foreground" /> entry with no PnL logged
            </p>
          </div>
        </div>

        {/* Entries */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-sm font-medium">{selectedLabel}</p>
            {dayEntries.length > 0 && (
              <p className={`text-xs font-medium tabular-nums ${dayTotal > 0 ? "text-emerald-500" : dayTotal < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                Day total {formatMoney(dayTotal)}
              </p>
            )}
          </div>

          {!editing ? (
            <div className="mt-4 space-y-2">
              {dayEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries logged for this day yet.</p>}
              {dayEntries.map((e) => {
                const n = pnlNumber(e.entry);
                const broke = brokenRules(e.entry, rules).length > 0;
                return (
                  <button
                    key={e.storageKey}
                    type="button"
                    onClick={() => {
                      setEditing(e);
                      setDirty(false);
                    }}
                    className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {sessionLabel(e.entry.session)}
                        {broke && <span className="ml-2 text-xs font-medium text-destructive">⚑ rule broken</span>}
                      </span>
                      <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground" />
                        {tradeCountLabel(e.entry)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.entry.notes || e.entry.levels || e.entry.wentWell || "Tap to open"}
                      </span>
                    </span>
                    {hasPnl(e.entry) && (
                      <span className={`shrink-0 text-sm font-medium tabular-nums ${n > 0 ? "text-emerald-500" : n < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        {formatMoney(n)}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="flex flex-wrap gap-2 pt-1">
                {SESSIONS.filter((s) => !takenSessions.has(s.key)).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setEditing({
                        storageKey: "",
                        slot: newSlot(),
                        entry: { ...EMPTY, session: s.key, ruleChecks: {}, trades: [], screenshots: [] },
                      });
                      setDirty(true);
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    ＋ {s.label} entry
                  </button>
                ))}
                {SESSIONS.every((s) => takenSessions.has(s.key)) && (
                  <p className="text-xs text-muted-foreground">
                    Both sessions are logged for this day — open an entry above to add more trades to it.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                {SESSIONS.map((s) => {
                  const active = editing.entry.session === s.key;
                  const takenByOther = !active && dayEntries.some((e) => e.entry.session === s.key && e.storageKey !== editing.storageKey);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      disabled={takenByOther}
                      onClick={() => setField("session", s.key)}
                      className={`min-h-9 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        active
                          ? "border-foreground bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setDirty(false);
                  }}
                  className="ml-auto text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Back to entries
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">💵 PnL for this entry ($)</p>
                  {(() => {
                    const isRed = editing.entry.pnl.trim().startsWith("-");
                    const abs = editing.entry.pnl.replace(/^-+/, "").trim();
                    const setDirection = (red: boolean) => {
                      if (abs === "") {
                        setField("pnl", red ? "-" : "");
                        return;
                      }
                      setField("pnl", red ? `-${abs}` : abs);
                    };
                    const setAmount = (val: string) => {
                      const clean = val.replace(/[^0-9.]/g, "");
                      setField("pnl", isRed && clean !== "" ? `-${clean}` : clean);
                    };
                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDirection(false)}
                          className={`min-h-9 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                            !isRed
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                              : "border-border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          🟢 Green
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirection(true)}
                          className={`min-h-9 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                            isRed
                              ? "border-red-500 bg-red-500/15 text-red-500"
                              : "border-border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          🔴 Red
                        </button>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={abs}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="450"
                          className="w-full max-w-40 rounded-xl border border-input bg-background px-4 py-3 text-sm tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    );
                  })()}
                  {tradesWithPnl(editing.entry).length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Session total is summed from your trades below: {formatMoney(pnlNumber(editing.entry))}
                    </p>
                  )}
                </div>

                <TradesEditor
                  entry={editing.entry}
                  onChange={(patch) => {
                    setEditing((prev) => (prev ? { ...prev, entry: { ...prev.entry, ...patch } } : prev));
                    setDirty(true);
                  }}
                />


                {rules.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">📋 My rules — did I follow them?</p>
                    <div className="mt-2 space-y-2">
                      {rules.map((r) => {
                        const state = editing.entry.ruleChecks[r.id];
                        return (
                          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3">
                            <p className="min-w-0 flex-1 text-sm">{r.text}</p>
                            <div className="flex gap-2">
                              {(["followed", "broken"] as const).map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() =>
                                    setField(
                                      "ruleChecks",
                                      { ...editing.entry.ruleChecks, [r.id]: v } as Record<string, "followed" | "broken">,
                                    )
                                  }
                                  className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                                    state === v
                                      ? v === "broken"
                                        ? "border-destructive bg-destructive text-destructive-foreground"
                                        : "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                                  }`}
                                >
                                  {v === "followed" ? "Followed" : "Broken"}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <PillField label="🎯 Bias" options={BIASES} value={editing.entry.bias} onChange={(v) => setField("bias", v)} />
                <TextField
                  label="📊 Key levels I watched"
                  placeholder="e.g. Yesterday high 20,410 / pre-market low 20,180"
                  value={editing.entry.levels}
                  onChange={(v) => setField("levels", v)}
                />
                <TextField label="✅ What I executed well" placeholder="Waited for confirmation before entry…" value={editing.entry.wentWell} onChange={(v) => setField("wentWell", v)} rows={2} />
                <TextField label="⚠️ What went wrong" placeholder="Chased the second entry after the news spike…" value={editing.entry.wentWrong} onChange={(v) => setField("wentWrong", v)} rows={2} />
                <PillField label="🧠 How I felt during the session" options={EMOTIONS} value={editing.entry.emotion} onChange={(v) => setField("emotion", v)} />
                <PillField label="📈 Session outcome" options={OUTCOMES} value={editing.entry.outcome} onChange={(v) => setField("outcome", v)} />
                <TextField label="📝 One rule for tomorrow" placeholder="No entries in the first 5 minutes of the open." value={editing.entry.rule} onChange={(v) => setField("rule", v)} />
                <TextField label="🗒️ Free notes" placeholder="Anything else worth remembering about this session…" value={editing.entry.notes} onChange={(v) => setField("notes", v)} rows={4} />

                <Screenshots
                  userId={userId}
                  shots={editing.entry.screenshots ?? []}
                  onChange={(shots) => {
                    setEditing((prev) => (prev ? { ...prev, entry: { ...prev.entry, screenshots: shots } } : prev));
                    setDirty(true);
                  }}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => editing && save.mutate(editing)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {save.isPending ? "Saving…" : "Save entry"}
                </button>
                {editing.storageKey && (
                  <button
                    type="button"
                    disabled={del.isPending}
                    onClick={() => editing && del.mutate(editing)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
                  >
                    Delete
                  </button>
                )}
                {dirty ? (
                  <p className="text-xs text-muted-foreground">Unsaved changes</p>
                ) : save.isSuccess ? (
                  <p className="text-xs text-muted-foreground">Saved to your account.</p>
                ) : null}
                {save.isError && <p className="text-xs text-destructive">Couldn’t save. Try again.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {alertFor && (
        <RuleBreakAlert
          broken={alertFor}
          consequence={consequence}
          onAcknowledge={() => {
            setAlertFor(null);
            if (editing) {
              const acked = { ...editing, entry: { ...editing.entry, consequenceAcknowledged: true } };
              setEditing(acked);
              save.mutate(acked);
            }
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------ rule break alert --------------------------- */

function RuleBreakAlert({
  broken,
  consequence,
  onAcknowledge,
}: {
  broken: MemberRule[];
  consequence: string;
  onAcknowledge: () => void;
}) {
  return (
    <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" />
      <div className="animate-rule-flash relative w-full max-w-lg rounded-2xl border-2 border-red-500 p-6 text-center text-white shadow-2xl">
        <p className="font-display text-3xl font-bold uppercase tracking-widest sm:text-4xl">Rules broken</p>
        <ul className="mt-5 space-y-2 text-left text-sm">
          {broken.map((r) => (
            <li key={r.id} className="rounded-lg bg-black/40 px-4 py-2">
              ✖ {r.text}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest">Your consequence</p>
        <p className="mt-2 font-display text-xl font-semibold sm:text-2xl">{consequence}</p>
        <button
          type="button"
          onClick={onAcknowledge}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          I’ll do it
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- rules setup ------------------------------ */

function RulesSetup({
  initialRules,
  initialConsequence,
  firstTime,
  onDone,
  onCancel,
}: {
  initialRules: MemberRule[];
  initialConsequence: string;
  firstTime: boolean;
  onDone: () => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [rules, setRules] = useState<MemberRule[]>(() =>
    initialRules.length > 0 ? initialRules : [{ id: newSlot(), text: "" }, { id: newSlot(), text: "" }, { id: newSlot(), text: "" }],
  );
  const [consequence, setConsequence] = useState(initialConsequence);
  const persist = useServerFn(saveMemberRules);

  const mutation = useMutation({
    mutationFn: () => persist({ data: { rules: rules.filter((r) => r.text.trim() !== ""), consequence } }),
    onSuccess: () => onDone(),
  });

  const valid = rules.some((r) => r.text.trim() !== "") && consequence.trim() !== "";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-medium">{firstTime ? "Set your daily trading rules" : "Edit my rules"}</h3>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        These are the rules you hold yourself to every session. If you mark any of them broken on an entry, the journal will remind you of the consequence you set here.
      </p>

      <div className="mt-5 space-y-2">
        {rules.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2">
            <input
              type="text"
              value={r.text}
              onChange={(e) => setRules((prev) => prev.map((p) => (p.id === r.id ? { ...p, text: e.target.value } : p)))}
              placeholder={i === 0 ? "No trades in the first 5 minutes of the open" : "Add another rule…"}
              className="min-h-11 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              aria-label="Remove rule"
              onClick={() => setRules((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== r.id) : prev))}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRules((prev) => [...prev, { id: newSlot(), text: "" }])}
          className="rounded-full border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-accent"
        >
          ＋ Add rule
        </button>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">⚠️ Consequence for breaking a rule</p>
        <textarea
          rows={2}
          value={consequence}
          onChange={(e) => setConsequence(e.target.value)}
          placeholder="e.g. 50 push-ups and no trading tomorrow"
          className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!valid || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : firstTime ? "Save rules & open journal" : "Save rules"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Cancel
          </button>
        )}
        {!valid && <p className="text-xs text-muted-foreground">Add at least one rule and a consequence.</p>}
        {mutation.isError && <p className="text-xs text-destructive">Couldn’t save. Try again.</p>}
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

/* -------------------------------- trades ---------------------------------- */

function TradesEditor({ entry, onChange }: { entry: Entry; onChange: (patch: Partial<Entry>) => void }) {
  const trades = entry.trades ?? [];
  const [sectionCollapsed, setSectionCollapsed] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const setCount = (count: number) => {
    const next = [...trades];
    while (next.length < count) next.push(newTrade());
    onChange({ tradeCount: String(count), trades: next.slice(0, count) });
    setSectionCollapsed(false);
    setCollapsedIds((prev) => {
      const nextSet = new Set(prev);
      next.slice(0, count).forEach((t) => nextSet.delete(t.id));
      return nextSet;
    });
  };

  const patchTrade = (id: string, patch: Partial<Trade>) => {
    onChange({ trades: trades.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  };

  const toggleSection = (n: number) => {
    if (entry.tradeCount === String(n)) {
      setSectionCollapsed((c) => !c);
    } else {
      setCount(n);
    }
  };

  const toggleTrade = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeTrade = (id: string) => {
    const remaining = trades.filter((t) => t.id !== id);
    onChange({ trades: remaining, tradeCount: String(remaining.length) });
  };

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        📊 How many trades did you take this session?
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map((n) => {
          const active = entry.tradeCount === String(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggleSection(n)}
              className={`min-h-9 min-w-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-foreground bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              {n === 0 ? "None" : n}
            </button>
          );
        })}
        {trades.length > 0 && (
          <button
            type="button"
            onClick={() => setCount(trades.length + 1)}
            className="min-h-9 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            ＋ one more
          </button>
        )}
      </div>

      {trades.length > 0 && (
        <div className="mt-3 space-y-3">
          {trades.map((t, i) => {
            const isCollapsed = sectionCollapsed || collapsedIds.has(t.id);
            const isRed = t.pnl.trim().startsWith("-");
            const abs = t.pnl.replace(/^-+/, "").trim();
            const directionLabel = DIRECTIONS.find((d) => d.key === t.direction)?.label ?? "";
            const resultLabel = RESULTS.find((r) => r.key === t.result)?.label ?? "";

            return (
              <div key={t.id} className="rounded-xl border border-border bg-background p-3">
                <button
                  type="button"
                  onClick={() => toggleTrade(t.id)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trade {i + 1}</p>
                    {isCollapsed && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.instrument
                          ? `${t.instrument}${directionLabel ? ` · ${directionLabel}` : ""}${resultLabel ? ` · ${resultLabel}` : ""}${t.pnl ? ` · ${t.pnl}` : ""}`
                          : "Tap to expand"}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isCollapsed && hasPnl({ ...EMPTY, pnl: t.pnl }) && (
                      <span className={`text-xs font-medium tabular-nums ${toNumber(t.pnl) > 0 ? "text-emerald-500" : toNumber(t.pnl) < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        {formatMoney(toNumber(t.pnl))}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground" aria-hidden>
                      {isCollapsed ? "›" : "⌄"}
                    </span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="mt-3 space-y-3">
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={t.instrument}
                        onChange={(e) => patchTrade(t.id, { instrument: e.target.value })}
                        placeholder="Pair / instrument (e.g. XAUUSD)"
                        className="min-h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {DIRECTIONS.map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => patchTrade(t.id, { direction: t.direction === d.key ? "" : d.key })}
                            className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              t.direction === d.key
                                ? "border-foreground bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground hover:bg-accent"
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {RESULTS.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => patchTrade(t.id, { result: t.result === r.key ? "" : r.key })}
                          className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            t.result === r.key
                              ? "border-foreground bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:bg-accent"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                      <span className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => patchTrade(t.id, { pnl: abs === "" ? "" : abs })}
                          className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            !isRed ? "border-emerald-500 bg-emerald-500/15 text-emerald-500" : "border-border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          🟢
                        </button>
                        <button
                          type="button"
                          onClick={() => patchTrade(t.id, { pnl: abs === "" ? "-" : `-${abs}` })}
                          className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isRed ? "border-red-500 bg-red-500/15 text-red-500" : "border-border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          🔴
                        </button>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={abs}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9.]/g, "");
                            patchTrade(t.id, { pnl: isRed && clean !== "" ? `-${clean}` : clean });
                          }}
                          placeholder="PnL $"
                          className="w-24 rounded-xl border border-input bg-background px-3 py-2 text-sm tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </span>
                    </div>

                    <input
                      type="text"
                      value={t.note}
                      onChange={(e) => patchTrade(t.id, { note: e.target.value })}
                      placeholder="What was the setup / why did you take it?"
                      className="min-h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />

                    <button
                      type="button"
                      onClick={() => removeTrade(t.id)}
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-destructive"
                    >
                      Remove trade
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ screenshots -------------------------------- */

function Screenshots({
  userId,
  shots,
  onChange,
}: {
  userId: string;
  shots: Shot[];
  onChange: (shots: Shot[]) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const missing = shots.map((s) => s.path).filter((p) => !urls[p]);
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase.storage.from("journal-shots").createSignedUrls(missing, 3600);
      if (!active || !data) return;
      setUrls((prev) => {
        const next = { ...prev };
        for (const item of data) {
          if (item.path && item.signedUrl) next[item.path] = item.signedUrl;
        }
        return next;
      });
    })();
    return () => {
      active = false;
    };
  }, [shots, urls]);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const added: Shot[] = [];
    for (const file of Array.from(files)) {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("journal-shots").upload(path, file, {
        contentType: file.type || "image/png",
        upsert: false,
      });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      added.push({ path });
    }
    setUploading(false);
    if (added.length > 0) onChange([...shots, ...added]);
  };

  const remove = async (path: string) => {
    onChange(shots.filter((s) => s.path !== path));
    await supabase.storage.from("journal-shots").remove([path]);
  };

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">🖼️ Screenshots</p>
      <p className="mt-1 text-xs text-muted-foreground">Attach your charts or executions for this session.</p>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shots.map((s) => (
          <div key={s.path} className="group relative overflow-hidden rounded-xl border border-border bg-background">
            {urls[s.path] ? (
              <button type="button" onClick={() => setLightbox(urls[s.path]!)} className="block h-28 w-full">
                <img src={urls[s.path]} alt="Journal screenshot" className="h-28 w-full object-cover" loading="lazy" />
              </button>
            ) : (
              <div className="flex h-28 w-full items-center justify-center text-xs text-muted-foreground">Loading…</div>
            )}
            <button
              type="button"
              onClick={() => remove(s.path)}
              aria-label="Remove screenshot"
              className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full border border-border bg-background/90 text-xs text-muted-foreground hover:text-destructive"
            >
              ✕
            </button>
          </div>
        ))}

        <label className="flex h-28 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-background text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          {uploading ? "Uploading…" : "＋ Add screenshot"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {lightbox && (
        <button
          type="button"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-6"
          aria-label="Close screenshot"
        >
          <img src={lightbox} alt="Journal screenshot" className="max-h-full max-w-full rounded-2xl object-contain" />
        </button>
      )}
    </div>
  );
}
