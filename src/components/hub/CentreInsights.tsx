import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { HubPayload } from "@/lib/hub.functions";
import type { ContextSymbol, InstrumentContext } from "@/lib/market-context.server";
import { getWeeklyBehavior } from "@/lib/weekly-behavior.functions";
import { getReadiness, saveReadiness } from "@/lib/readiness.functions";
import { useAdminMode } from "@/hooks/use-admin-mode";
import { econTimeToLocal } from "@/lib/hub-session";
import {
  INSTRUMENTS, NEAR_PCT, ctxOf, mtfOf, marketState, stateTone, volTone, driverAlignment,
  structureClarity, liquidityClarity, radar, nearestOpen, nextMajorEvent, laDateISO, type Tone,
} from "@/lib/centre-insights";

const UNAVAILABLE = "DATA UNAVAILABLE";

const TONE: Record<Tone, string> = {
  pos: "text-emerald-600 dark:text-emerald-400",
  neg: "text-red-600 dark:text-red-400",
  warn: "text-amber-600 dark:text-amber-400",
  info: "text-foreground",
};
const DOT: Record<Tone, string> = { pos: "bg-emerald-500", neg: "bg-red-500", warn: "bg-amber-500", info: "bg-muted-foreground" };

function fmt(n: number, sym: ContextSymbol) {
  return n.toLocaleString(undefined, { minimumFractionDigits: sym === "XAU/USD" ? 1 : 0, maximumFractionDigits: sym === "XAU/USD" ? 1 : 0 });
}

function Card({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 ${className}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h2 className="truncate font-display text-base font-semibold uppercase tracking-widest sm:text-lg">{title}</h2>
        {right && <div className="shrink-0 text-[11px] text-muted-foreground">{right}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const Delayed = () => <span>Delayed ~15 min</span>;

/** On phones the body collapses behind a tap; on larger screens it is always open. */
export function MobileCollapse({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-border bg-card px-4 text-left text-sm font-semibold uppercase tracking-widest sm:hidden"
      >
        {title}
        <span aria-hidden className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      <div className={`${open ? "mt-3 block" : "hidden"} sm:mt-0 sm:block`}>{children}</div>
    </div>
  );
}

/* ------------------------------ Market Brief ------------------------------ */

export function MarketBrief({ payload }: { payload: HubPayload }) {
  const live = payload.sessions.sessions.find((s) => s.state === "open");
  const session = live ? live.label : payload.sessions.marketsClosed ? "Markets closed" : "Pre-New York";
  const nas = ctxOf(payload, "NASDAQ");
  const st = marketState(nas, mtfOf(payload, "NASDAQ"));
  const near = nearestOpen(nas);
  const ev = nextMajorEvent(payload);
  const y = payload.context?.us02y ?? null;
  const env = (k: ContextSymbol) => driverAlignment(payload, k) ?? UNAVAILABLE;
  const liq = near.above || near.below ? [near.above?.label, near.below?.label].filter(Boolean).join(" / ") : UNAVAILABLE;
  const watch = !nas
    ? "Market data is unavailable — check levels on your own chart before New York."
    : `NY interaction with ${liq === UNAVAILABLE ? "the nearest session levels" : liq} and whether price ${st?.label === "EXPANDING" || st?.label === "TRENDING" ? "sustains the move or returns inside the established range" : "stays inside the current range or breaks out of it"}.`;

  const rows: [string, string, Tone][] = [
    ["Session", session, "info"],
    ["Market State", st?.label ?? UNAVAILABLE, st ? stateTone(st.label) : "info"],
    ["Volatility", nas?.volatility?.level ?? UNAVAILABLE, nas?.volatility ? volTone(nas.volatility.level) : "info"],
    ["Liquidity", liq, "info"],
    ["US02Y", y ? `${y.direction === "up" ? "↑ Rising" : y.direction === "down" ? "↓ Easing" : "→ Flat"}` : UNAVAILABLE, "info"],
    ["US30 Environment", env("US30"), env("US30") === "Aligned" ? "pos" : env("US30") === "Conflicting" ? "neg" : "info"],
    ["NAS100 Environment", env("NASDAQ"), env("NASDAQ") === "Aligned" ? "pos" : env("NASDAQ") === "Conflicting" ? "neg" : "info"],
    ["Major Scheduled Event", ev ? `${econTimeToLocal(ev.date, ev.time)} ${ev.title}` : "None today", ev ? "warn" : "info"],
  ];
  return (
    <Card title="SHLM Market Brief" right={<Delayed />} className="border-foreground/40">
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map(([k, v, t]) => (
          <div key={k} className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] items-baseline gap-2 border-b border-border/60 pb-2 text-sm">
            <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</dt>
            <dd className={`min-w-0 break-words font-medium ${v === UNAVAILABLE ? "text-muted-foreground" : TONE[t]}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">What to watch</p>
      <p className="mt-1 text-sm leading-relaxed">{watch}</p>
      <p className="mt-2 text-[10px] text-muted-foreground">Summary of the sections below. Context only — not a trade signal.</p>
    </Card>
  );
}

/* ------------------- Daily Market Map strip (inside cards) ------------------ */

export function MarketMapStrip({ payload, symbol }: { payload: HubPayload; symbol: ContextSymbol }) {
  const ctx = ctxOf(payload, symbol);
  const order = ["Asia", "London", "Previous Day", "Overnight"];
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Market map · futures levels</p>
      {!ctx || !ctx.levels.length ? (
        <p className="mt-2 text-xs text-muted-foreground">{ctx ? "Session levels still forming" : UNAVAILABLE}</p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          {order.map((name) => {
            const h = ctx.levels.find((l) => l.label === `${name} High`);
            const l = ctx.levels.find((x) => x.label === `${name} Low`);
            if (!h || !l) return null;
            return (
              <div key={name} className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{name}</p>
                <p className="tabular-nums">
                  <span className={h.swept ? "text-muted-foreground line-through" : ""}>H {fmt(h.price, symbol)}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className={l.swept ? "text-muted-foreground line-through" : ""}>L {fmt(l.price, symbol)}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
      {ctx && <p className="mt-1.5 text-[10px] text-muted-foreground">Futures price {fmt(ctx.price, symbol)} · struck-through = already swept today</p>}
    </div>
  );
}

/* ------------------------------ Liquidity Radar ----------------------------- */

function SymbolTabs({ value, onChange }: { value: ContextSymbol; onChange: (k: ContextSymbol) => void }) {
  return (
    <div role="tablist" className="inline-flex rounded-full border border-border p-0.5">
      {INSTRUMENTS.map((i) => (
        <button
          key={i.key}
          role="tab"
          aria-selected={value === i.key}
          onClick={() => onChange(i.key)}
          className={`min-h-8 rounded-full px-3 text-xs font-medium ${value === i.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {i.name}
        </button>
      ))}
    </div>
  );
}

export function LiquidityRadar({ payload }: { payload: HubPayload }) {
  const [sym, setSym] = useState<ContextSymbol>("NASDAQ");
  const ctx = ctxOf(payload, sym);
  const r = radar(ctx);
  const Side = ({ title, list }: { title: string; list: NonNullable<ReturnType<typeof radar>>["above"] }) => (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{title}</p>
      {list.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No mapped levels</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {list.map((l) => (
            <li key={l.label} className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-2 text-sm ${l.swept ? "text-muted-foreground" : ""}`}>
              <span className="min-w-0 truncate">{l.label}{l.swept ? " · swept" : ""}</span>
              <span className="tabular-nums">{fmt(l.price, sym)}</span>
              <span className={`w-10 text-right text-[10px] uppercase tracking-widest ${!l.swept && l.pct <= NEAR_PCT ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {l.pct <= NEAR_PCT ? "Near" : "Far"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <Card title="Liquidity Radar" right={<SymbolTabs value={sym} onChange={setSym} />}>
      {!ctx || !r ? (
        <p className="text-sm text-muted-foreground">{UNAVAILABLE}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Side title="↑ Upside liquidity" list={r.above} />
            <Side title="↓ Downside liquidity" list={r.below} />
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Resting session highs/lows around futures price {fmt(ctx.price, sym)}. Near = within {NEAR_PCT}%. Shows where liquidity sits — not where price will go. Delayed ~15 min.
          </p>
        </>
      )}
    </Card>
  );
}

/* ----------------------------- Market Conditions ---------------------------- */

export function MarketConditions({ payload }: { payload: HubPayload }) {
  const { viewAsMember } = useAdminMode();
  const fetchWeekly = useServerFn(getWeeklyBehavior);
  const { data: wk } = useQuery({
    queryKey: ["weekly-behavior", viewAsMember],
    queryFn: () => fetchWeekly({ data: { asMember: viewAsMember } }),
    retry: false,
    refetchInterval: 60_000,
  });
  const w = wk?.data;
  const day = w?.todayDow;
  const status = day === 1 ? w?.monday : day === 5 ? w?.friday : null;
  const fixed: Record<number, string> = { 2: "MANIPULATION → EXPANSION", 3: "MANIPULATION → EXPANSION", 4: "BIG PUSH / EXPANSION" };

  return (
    <Card title="Market Conditions" right={<Delayed />}>
      <div className="divide-y divide-border">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-2 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Market</span><span>State</span><span>5M Volatility</span>
        </div>
        {INSTRUMENTS.map((i) => {
          const ctx = ctxOf(payload, i.key);
          const st = marketState(ctx, mtfOf(payload, i.key));
          return (
            <div key={i.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] items-baseline gap-2 py-2 text-sm">
              <span className="font-medium">{i.name}</span>
              <span className="min-w-0">
                <span className={`font-semibold ${st ? TONE[stateTone(st.label)] : "text-muted-foreground"}`}>{st?.label ?? UNAVAILABLE}</span>
                {st && <span className="block text-[10px] text-muted-foreground">{st.why}</span>}
              </span>
              <span className={`font-semibold ${ctx?.volatility ? TONE[volTone(ctx.volatility.level)] : "text-muted-foreground"}`}>
                {ctx?.volatility ? ctx.volatility.level : UNAVAILABLE}
                {ctx?.volatility && <span className="block text-[10px] font-normal text-muted-foreground">{ctx.volatility.ratio}× 5-day avg candle</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Day character</p>
          <Link to="/centre/weekly-behavior" className="text-xs underline underline-offset-2">Full read →</Link>
        </div>
        {!w ? (
          <p className="mt-1 text-sm text-muted-foreground">Loading…</p>
        ) : day && fixed[day] ? (
          <p className="mt-1 font-display text-sm font-semibold">{fixed[day]}{w.fixedNote ? <span className="block text-[11px] font-normal text-muted-foreground">{w.fixedNote.text}</span> : null}</p>
        ) : status?.kind === "classified" ? (
          <>
            <p className="mt-1 font-display text-sm font-semibold">{status.developing ? "Developing — " : ""}{status.label}</p>
            <p className="text-[11px] text-muted-foreground">{status.reason}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {status.checks.filter((c) => c.passed !== null).sort((a, b) => b.weight - a.weight).slice(0, 3).map((c) => (
                <li key={c.key} className="rounded-full border border-border px-2 py-0.5 text-[10px]">{c.reason}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{status && "reason" in status ? status.reason : "Markets closed"}</p>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------ NY Opening Range ---------------------------- */

export function OpeningRange({ payload }: { payload: HubPayload }) {
  return (
    <Card title="NY Opening Range" right={<span>6:30–6:45 AM PT · Delayed</span>}>
      <div className="grid gap-3 sm:grid-cols-3">
        {INSTRUMENTS.map((i) => {
          const or = ctxOf(payload, i.key)?.openingRange ?? null;
          return (
            <div key={i.key} className="min-w-0 rounded-xl border border-border bg-surface p-3 text-sm">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{i.name}</p>
              {!or ? (
                <p className="mt-1 text-muted-foreground">{UNAVAILABLE}</p>
              ) : or.state === "pending" ? (
                <p className="mt-1 text-muted-foreground">Forms at the 6:30 AM open</p>
              ) : (
                <>
                  <p className="mt-1 tabular-nums">H {fmt(or.high, i.key)} · L {fmt(or.low, i.key)}</p>
                  {or.state === "forming" ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">Forming</p>
                  ) : (
                    <>
                      <p className="text-[11px] text-muted-foreground">Size {fmt(or.size, i.key)}</p>
                      <p className={`mt-1 font-semibold ${or.position === "inside" ? "text-foreground" : "text-amber-600 dark:text-amber-400"}`}>
                        {or.position === "inside" ? "Inside range" : `Expanding ${or.position}`}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ----------------------------- Symbol comparison ---------------------------- */

export function SymbolCompare({ payload }: { payload: HubPayload }) {
  const tone = (v: string | null | undefined) =>
    !v ? "text-muted-foreground" : ["Clear", "Aligned"].includes(v) ? TONE.pos : ["Conflicted", "Conflicting", "Unclear"].includes(v) ? TONE.neg : TONE.info;
  return (
    <Card title="Market Environment" right={<span>Comparison only — not a pick</span>}>
      <div className="grid gap-3 sm:grid-cols-3">
        {INSTRUMENTS.map((i) => {
          const ctx: InstrumentContext | undefined = ctxOf(payload, i.key);
          const mtf = mtfOf(payload, i.key);
          const rows: [string, string | null | undefined][] = [
            ["Structure", structureClarity(mtf)],
            ["Volatility", ctx?.volatility?.level],
            ["Drivers", driverAlignment(payload, i.key)],
            ["Liquidity", liquidityClarity(ctx)],
            ["State", marketState(ctx, mtf)?.label],
          ];
          return (
            <div key={i.key} className="min-w-0 rounded-xl border border-border bg-surface p-3">
              <p className="font-display text-sm font-semibold">{i.name}</p>
              <dl className="mt-2 space-y-1 text-xs">
                {rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className={`min-w-0 truncate font-medium ${tone(v)}`}>{v ?? "Unavailable"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------ Trade Readiness ----------------------------- */

const CHECKS = [
  ["liquidity", "Session liquidity identified"],
  ["structure", "Market structure identified"],
  ["state", "Market state identified"],
  ["drivers", "Drivers checked"],
  ["news", "News checked"],
  ["volatility", "Volatility checked"],
  ["entry", "Entry level identified"],
  ["risk", "Risk defined"],
] as const;

export function TradeReadiness({ readOnly }: { readOnly: boolean }) {
  const date = laDateISO();
  const load = useServerFn(getReadiness);
  const save = useServerFn(saveReadiness);
  const { data } = useQuery({ queryKey: ["readiness", date], queryFn: () => load({ data: { date } }), enabled: !readOnly, retry: false });
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  useEffect(() => { if (data) setChecks(data.checks); }, [data]);
  const done = CHECKS.filter(([k]) => checks[k]).length;
  const toggle = (k: string) => {
    const next = { ...checks, [k]: !checks[k] };
    setChecks(next);
    if (!readOnly) save({ data: { date, checks: next } }).catch(() => {});
  };
  return (
    <Card title="Trade Readiness" right={<span className="tabular-nums">{done} of {CHECKS.length} complete</span>}>
      <ul className="grid gap-1 sm:grid-cols-2">
        {CHECKS.map(([k, label]) => (
          <li key={k}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-accent">
              <input type="checkbox" checked={!!checks[k]} onChange={() => toggle(k)} className="h-4 w-4 shrink-0 accent-foreground" />
              <span className={checks[k] ? "text-muted-foreground line-through" : ""}>{label}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Preparation checklist only — it does not tell you to take a trade. {readOnly ? "Read-only view: ticks aren't saved." : "Resets each day."}
      </p>
    </Card>
  );
}
