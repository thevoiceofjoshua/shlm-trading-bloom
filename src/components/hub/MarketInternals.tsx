import type { HubPayload } from "@/lib/hub.functions";

type Payload = NonNullable<HubPayload["internals"]>;
type Read = Payload["reads"][number];

const LABELS = {
  TICK: { bullish: "Bullish pressure", neutral: "Neutral-mixed", bearish: "Bearish pressure" },
  ADD: { bullish: "Bullish breadth", neutral: "Neutral-mixed breadth", bearish: "Bearish breadth" },
  VOLD: { bullish: "Bullish volume participation", neutral: "Neutral-mixed", bearish: "Bearish volume participation" },
} as const;

const PART: Record<Read["participation"], { text: string; tone: string }> = {
  confirming: { text: "CONFIRMING", tone: "bullish" },
  mixed: { text: "MIXED", tone: "neutral" },
  diverging: { text: "DIVERGING", tone: "bearish" },
  unavailable: { text: "DATA UNAVAILABLE", tone: "muted" },
};
const BRK: Record<Read["breakout"], { text: string; tone: string }> = {
  confirmed: { text: "CONFIRMED", tone: "bullish" },
  caution: { text: "CAUTION", tone: "neutral" },
  not_confirmed: { text: "BREAKOUT NOT CONFIRMED", tone: "bearish" },
  no_breakout: { text: "No active breakout", tone: "muted" },
  unavailable: { text: "DATA UNAVAILABLE", tone: "muted" },
};

function toneCls(tone: string) {
  if (tone === "bullish") return "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (tone === "bearish") return "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400";
  if (tone === "muted") return "border-border bg-surface text-muted-foreground";
  return "border-border bg-surface text-foreground";
}

function Pill({ k, v, tone }: { k: string; v: string; tone: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneCls(tone)}`}>
      <span className="shrink-0 uppercase tracking-widest opacity-70">{k}</span>
      <span className="min-w-0 truncate font-display tracking-tight">{v}</span>
    </span>
  );
}

function ReadCard({ read }: { read: Read }) {
  const name = read.symbol === "NASDAQ" ? "NASDAQ · MNQ" : "Dow · MYM";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{name}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {read.readings.map((r) => (
          <Pill
            key={r.key}
            k={`$${r.key}`}
            v={r.available && r.bias ? LABELS[r.key][r.bias] : "DATA UNAVAILABLE"}
            tone={r.available && r.bias ? (r.bias === "neutral" ? "neutral" : r.bias) : "muted"}
          />
        ))}
        <Pill
          k="VIX"
          v={read.vix.available ? `${read.vix.value} (${(read.vix.changePct ?? 0) >= 0 ? "+" : ""}${read.vix.changePct}%)` : "DATA UNAVAILABLE"}
          tone={read.vix.available ? "neutral" : "muted"}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{read.vix.note}</p>
      <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="uppercase tracking-widest text-muted-foreground">Internal participation:</span>
          <Pill k="" v={PART[read.participation].text} tone={PART[read.participation].tone} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="uppercase tracking-widest text-muted-foreground">Breakout confirmation:</span>
          <Pill k="" v={BRK[read.breakout].text} tone={BRK[read.breakout].tone} />
        </div>
        {read.divergence && <p className="font-display text-sm font-semibold">{read.divergence}</p>}
        <p className="text-[11px] text-muted-foreground">{read.note}</p>
      </div>
    </div>
  );
}

export function MarketInternals({ payload }: { payload: HubPayload }) {
  const data = payload.internals;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-medium tracking-tight">Market Internals</h2>
        <p className="text-xs text-muted-foreground">Is the broader market participating in the index move? Confirmation context only.</p>
      </div>
      {!data ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
          DATA UNAVAILABLE — market internals could not be loaded.
        </div>
      ) : (
        <>
          {data.missing.length > 0 && (
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Data unavailable: {data.missing.join(", ")}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {data.reads.map((r) => <ReadCard key={r.symbol} read={r} />)}
          </div>
        </>
      )}
    </section>
  );
}
