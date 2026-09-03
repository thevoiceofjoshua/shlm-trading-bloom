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

function RangePills({ high, low, dp = 0 }: { high: number; low: number; dp?: number }) {
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {[
        { k: "High", v: high },
        { k: "Low", v: low },
      ].map(({ k, v }) => (
        <span
          key={k}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px]"
        >
          <span className="uppercase tracking-widest text-muted-foreground">{k}</span>
          <span className="font-display font-medium tabular-nums">{fmt(v)}</span>
        </span>
      ))}
    </div>
  );
}

function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      {right}
    </div>
  );
}

function DriverTile({ d }: { d: { symbol: string; price: number; changePct: number; note: string } }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-foreground/40">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-xs font-semibold uppercase tracking-wider">{d.symbol}</p>
        <p className={`shrink-0 text-[11px] font-medium tabular-nums ${changeColor(d.changePct)}`}>
          {d.changePct >= 0 ? "+" : ""}
          {d.changePct}%
        </p>
      </div>
      <p className="mt-1 font-display text-base font-medium tabular-nums">{d.price.toFixed(1)}</p>
      <div className="mt-2">{strengthBar(d.changePct)}</div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{d.note}</p>
    </div>
  );
}

export function IndexCards({ payload }: { payload: HubPayload }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {payload.indexes.map((idx) => (
        <div key={idx.symbol} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-widest text-muted-foreground">{idx.symbol}</p>
              <h3 className="truncate font-display text-lg font-medium">{idx.name}</h3>
            </div>
            <span className={`shrink-0 whitespace-nowrap text-right text-xs font-medium sm:text-sm ${changeColor(idx.changePct)}`}>
              {idx.change >= 0 ? "+" : ""}
              {idx.change.toFixed(1)} ({idx.changePct >= 0 ? "+" : ""}
              {idx.changePct}%)
            </span>
          </div>
          <p className="mt-3 font-display text-[1.75rem] font-medium tabular-nums sm:text-3xl">{idx.price.toLocaleString()}</p>
          <RangePills high={idx.dayHigh} low={idx.dayLow} />

          <ScalperLevels quote={idx} />
        </div>
      ))}
    </div>
  );
}

type LiqLevel = NonNullable<HubPayload["indexes"][number]["pullbacks"]>[number];
type Structure = NonNullable<HubPayload["indexes"][number]["h1"]>;

function biasPill(bias: Structure["bias"]) {
  const map = {
    bullish: { text: "↑ Bullish", cls: "border-emerald-500/40 text-emerald-500" },
    bearish: { text: "↓ Bearish", cls: "border-red-500/40 text-red-500" },
    ranging: { text: "→ Ranging", cls: "border-border text-muted-foreground" },
  } as const;
  const b = map[bias];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${b.cls}`}>
      {b.text}
    </span>
  );
}

function LevelRow({ level, role, price }: { level?: LiqLevel; role: string; price: number }) {
  if (!level) {
    return (
      <div>
        <p className="text-muted-foreground">{role}</p>
        <p className="font-display text-base font-medium text-muted-foreground">—</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">No data</p>
      </div>
    );
  }
  const dist = level.price - price;
  const pct = price ? (dist / price) * 100 : 0;
  const toneCls = level.side === "high" ? "text-emerald-500" : "text-red-500";
  return (
    <div>
      <p className="text-muted-foreground">
        {role} <span className="text-muted-foreground/60">· {level.label}</span>
      </p>
      <p className={`font-display text-base font-medium tabular-nums ${level.swept ? "text-muted-foreground" : "text-foreground"}`}>
        {level.price.toLocaleString()}
      </p>
      <div className="mt-0.5 flex items-center gap-2">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
            level.swept ? "bg-border/60 text-muted-foreground" : `bg-transparent ring-1 ring-current ${toneCls}`
          }`}
        >
          {level.swept ? "Swept" : "Untapped"}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {dist >= 0 ? "+" : ""}
          {Math.abs(dist) >= 100 ? Math.round(dist).toLocaleString() : dist.toFixed(1)} ({pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}

function ScalperLevels({ quote }: { quote: HubPayload["indexes"][number] }) {
  const h1 = quote.h1;
  const pullbacks = quote.pullbacks ?? [];
  return (
    <>
      <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="uppercase tracking-widest text-muted-foreground">1H structure — direction</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {h1?.event && (
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-foreground">
                {h1.event}
              </span>
            )}
            {h1?.sequence && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {h1.sequence}
              </span>
            )}
            {h1 ? biasPill(h1.bias) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <LevelRow level={h1?.target} role="Main target" price={quote.price} />
          <LevelRow level={h1?.invalidation} role="Invalidation" price={quote.price} />
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
        <p className="uppercase tracking-widest text-muted-foreground">5m execution — pullback entries</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <LevelRow level={pullbacks[0]} role="Deeper entry zone" price={quote.price} />
          <LevelRow level={pullbacks[1]} role="First entry zone" price={quote.price} />
        </div>
        <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground/80">
          Direction and target come off the 1H (BOS continues it, CHoCH flips it). Execute on the 5m: wait for the pullback into these
          untapped highs/lows, then run with the 1H draw.
        </p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
          {quote.levelsSetAt
            ? `Levels set ${new Date(quote.levelsSetAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} PST`
            : "Levels set 5:00 AM PST"}
        </p>
      </div>
    </>

  );
}


export function MagSevenBoard({ payload }: { payload: HubPayload }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h3 className="min-w-0 font-display text-lg font-medium">NASDAQ drivers</h3>
        <span className="min-w-0 text-xs leading-snug text-muted-foreground sm:text-right">{payload.nasdaqMovers?.label}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {payload.magSeven.map((s) => (
          <DriverTile key={s.symbol} d={s} />
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <SectionHead title="Macro drivers" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(payload.nasdaqMacro ?? []).map((m) => (
            <MacroTile key={m.label} macro={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DowBoard({ payload }: { payload: HubPayload }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h3 className="min-w-0 font-display text-lg font-medium">Dow 30 drivers — US30</h3>
        <span className="min-w-0 text-xs leading-snug text-muted-foreground sm:text-right">{payload.dowMovers.label}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {payload.dowDrivers.map((d) => (
          <DriverTile key={d.symbol} d={d} />
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <SectionHead title="Macro drivers" />
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
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-widest text-muted-foreground">XAU/USD</p>
          <h3 className="truncate font-display text-lg font-medium">Gold desk</h3>
        </div>
        <span className={`shrink-0 whitespace-nowrap text-right text-xs font-medium sm:text-sm ${changeColor(g.changePct)}`}>
          {g.change >= 0 ? "+" : ""}
          {g.change.toFixed(1)} ({g.changePct >= 0 ? "+" : ""}
          {g.changePct}%)
        </span>
      </div>
      <p className="mt-3 font-display text-[1.75rem] font-medium tabular-nums sm:text-3xl">{g.price.toFixed(1)}</p>

      <RangePills high={g.dayHigh} low={g.dayLow} dp={1} />

      <ScalperLevels quote={g} />


      <div className="mt-5 border-t border-border pt-4">
        <SectionHead title="Gold drivers" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {payload.goldDrivers.map((m) => (
            <MacroTile key={m.label} macro={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
