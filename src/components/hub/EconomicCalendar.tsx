import { useState } from "react";
import type { HubPayload } from "@/lib/hub.functions";
import { econTimeToLocal } from "@/lib/hub-session";
import { SESSIONS } from "@/lib/market-data";

/** Where a release lands relative to the SHLM trading windows (LA wall clock). */
function sessionContext(laTime: string): string {
  const [h, m] = laTime.split(":").map((v) => parseInt(v, 10));
  const mins = h * 60 + m;
  for (const s of SESSIONS) {
    const start = s.startH * 60 + s.startM;
    const end = s.endH * 60 + s.endM;
    const name = s.label.split("—")[0].trim();
    if (mins >= start && mins < end) return `Lands inside ${name}`;
    if (mins < start && start - mins <= 180) return `Lands ${start - mins} min before ${name}`;
  }
  return "Outside the SHLM trading windows";
}

export function EconomicCalendar({ payload }: { payload: HubPayload }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const events = [...payload.econEvents]
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const [open, setOpen] = useState<number | null>(null);

  // Next upcoming release
  const next = events.find((e) => e.date + e.time >= todayStr);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-medium">Economic calendar</h3>
        {next && (
          <span className="text-xs text-muted-foreground">
            Next: {next.title} — {econTimeToLocal(next.date, next.time)}
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
          const isOpen = open === i;
          return (
            <div key={i}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 py-2.5 text-left text-sm transition-colors hover:text-foreground"
              >
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
                  <span className={`text-xs text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </div>
              </button>

              {isOpen && (
                <div className="pb-4">
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {e.currency && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                          {e.currency}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{sessionContext(e.time)}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { label: "Actual", value: e.actual },
                        { label: "Forecast", value: e.forecast },
                        { label: "Previous", value: e.previous },
                      ].map((f) => (
                        <div key={f.label} className="rounded-lg border border-border bg-card px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{f.label}</p>
                          <p className="mt-0.5 font-display text-base tabular-nums">{f.value ?? "—"}</p>
                        </div>
                      ))}
                    </div>

                    {e.detail && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{e.detail}</p>}

                    {e.affects && e.affects.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">What it moves</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {e.affects.map((a) => (
                            <span key={a} className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No high-impact releases left this week.</p>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        {payload.econLive
          ? "Live economic calendar — high and medium impact releases this week, in your local time."
          : "Sample data — live feed unavailable right now."}
      </p>
    </div>
  );
}


/* ----------------------- Bias journal ----------------------- */
