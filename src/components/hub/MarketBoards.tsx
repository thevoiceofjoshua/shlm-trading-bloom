import { useState } from "react";
import type { HubPayload } from "@/lib/hub.functions";

function changeColor(pct: number) {
  if (pct > 0) return "text-emerald-500";
  if (pct < 0) return "text-red-500";
  return "text-muted-foreground";
}

function strengthBar(pct: number) {
  const width = Math.min(Math.abs(pct) * 40, 100);
  const color = pct >= 0 ? "bg-emerald-500" : "bg-red-500";
  return (
    <div className="h-1 w-full rounded-full bg-border">
      <div className={`h-1 rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function IndexCards({ payload }: { payload: HubPayload }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {payload.indexes.map((idx) => (
        <div key={idx.symbol} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{idx.symbol}</p>
              <h3 className="font-display text-lg font-medium">{idx.name}</h3>
            </div>
            <span className={`text-sm font-medium ${changeColor(idx.changePct)}`}>
              {idx.change >= 0 ? "+" : ""}
              {idx.change.toFixed(1)} ({idx.changePct >= 0 ? "+" : ""}
              {idx.changePct}%)
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-medium tabular-nums">{idx.price.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>H {idx.dayHigh.toLocaleString()}</span>
            <span>L {idx.dayLow.toLocaleString()}</span>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs">
            <p className="uppercase tracking-widest text-muted-foreground">Key levels</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <Level label="PD High" val={idx.priorDayHigh} />
              <Level label="PD Low" val={idx.priorDayLow} />
              <Level label="Pre High" val={idx.premarketHigh} />
              <Level label="Pre Low" val={idx.premarketLow} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Level({ label, val }: { label: string; val: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{val.toLocaleString()}</span>
    </div>
  );
}

export function MagSevenBoard({ payload }: { payload: HubPayload }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-medium">Mag 7 — NASDAQ drivers</h3>
        <span className="text-xs text-muted-foreground">{payload.magBreadth.label}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {payload.magSeven.map((s) => (
          <div key={s.symbol} className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-semibold">{s.symbol}</p>
            <p className="mt-1 font-display text-sm font-medium tabular-nums">{s.price.toFixed(1)}</p>
            <p className={`text-xs ${changeColor(s.changePct)}`}>
              {s.changePct >= 0 ? "+" : ""}
              {s.changePct}%
            </p>
            <div className="mt-2">{strengthBar(s.changePct)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DowBoard({ payload }: { payload: HubPayload }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-medium">Dow 30 drivers — US30</h3>
        <span className="text-xs text-muted-foreground">What's moving US30: {payload.dowMovers.label}</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[480px] grid-cols-2 gap-2 sm:grid-cols-5">
          {payload.dowDrivers.map((d) => (
            <div key={d.symbol} className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-semibold">{d.symbol}</p>
              <p className="mt-0.5 font-display text-sm font-medium tabular-nums">{d.price.toFixed(1)}</p>
              <p className={`text-xs ${changeColor(d.changePct)}`}>
                {d.changePct >= 0 ? "+" : ""}
                {d.changePct}%
              </p>
              <div className="mt-1.5">{strengthBar(d.changePct)}</div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{d.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Macro drivers</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {payload.dowMacro.map((m) => (
            <MacroTile key={m.label} macro={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MacroTile({ macro }: { macro: HubPayload["dowMacro"][number] }) {
  const [open, setOpen] = useState(false);
  const arrow = macro.direction === "up" ? "↑" : macro.direction === "down" ? "↓" : "→";
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{macro.label}</span>
        <span className="font-display text-sm font-medium tabular-nums">{macro.value}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className={changeColor(macro.direction === "up" ? 1 : macro.direction === "down" ? -1 : 0)}>
          {arrow}
        </span>{" "}
        {macro.read}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 text-[11px] underline decoration-dotted underline-offset-2 text-muted-foreground hover:text-foreground"
      >
        {open ? "Hide context" : "Why? tap to expand"}
      </button>
      {open && <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{macro.context}</p>}
    </div>
  );
}

export function GoldDesk({ payload }: { payload: HubPayload }) {
  const g = payload.gold;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">XAU/USD</p>
          <h3 className="font-display text-lg font-medium">Gold desk</h3>
        </div>
        <span className={`text-sm font-medium ${changeColor(g.changePct)}`}>
          {g.change >= 0 ? "+" : ""}
          {g.change.toFixed(1)} ({g.changePct >= 0 ? "+" : ""}
          {g.changePct}%)
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-medium tabular-nums">{g.price.toFixed(1)}</p>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span>H {g.dayHigh.toFixed(1)}</span>
        <span>L {g.dayLow.toFixed(1)}</span>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Gold drivers</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {payload.goldDrivers.map((m) => {
            const arrow = m.direction === "up" ? "↑" : m.direction === "down" ? "↓" : "→";
            return (
              <div key={m.label} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{m.label}</span>
                  <span className="font-display text-sm font-medium tabular-nums">{m.value}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className={changeColor(m.direction === "up" ? 1 : m.direction === "down" ? -1 : 0)}>
                    {arrow}
                  </span>{" "}
                  {m.read}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
