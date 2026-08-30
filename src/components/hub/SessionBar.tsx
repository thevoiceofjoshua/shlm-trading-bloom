import { useEffect, useState } from "react";
import { SITE_TIMEZONE_LABEL } from "@/lib/time";
import type { HubPayload } from "@/lib/hub.functions";

export function SessionBar({ payload }: { payload: HubPayload }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const localTime = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  const { sessions, marketsClosed, nextNote } = payload.sessions;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-2xl font-medium tabular-nums tracking-tight">{localTime}</span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {SITE_TIMEZONE_LABEL} market
        </span>
      </div>

      {marketsClosed && nextNote ? (
        <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          {nextNote}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {sessions.map((s) => (
            <div
              key={s.key}
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                s.state === "open"
                  ? "border-foreground bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              <span className="font-medium">{s.label}</span>
              <span className="ml-3 text-xs opacity-80">
                {s.state === "open" ? "● Live now" : s.countdown ?? "Closed"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
