import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { disconnectWise, getWiseStatus, saveWiseToken, setWiseMode } from "@/lib/payouts.functions";

type Mode = "sandbox" | "live";

export function WiseConnectCard() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getWiseStatus);
  const save = useServerFn(saveWiseToken);
  const disconnect = useServerFn(disconnectWise);
  const switchMode = useServerFn(setWiseMode);
  const q = useQuery({ queryKey: ["wise-status"], queryFn: () => fetchStatus(), retry: 1 });
  const [editing, setEditing] = useState<Mode | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      await qc.invalidateQueries({ queryKey: ["wise-status"] });
      qc.invalidateQueries({ queryKey: ["payout-summary"] });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  };

  if (q.isError) return null;
  const s = q.data;

  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-medium">Wise payouts</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Pay recruiters from your Wise balance. Your token is stored encrypted and never shown again.
      </p>
      {!s ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active mode:</span>
            {(["sandbox", "live"] as Mode[]).map((m) => (
              <button
                key={m}
                disabled={busy || s.activeMode === m || (m === "live" && !s.sandboxVerified)}
                onClick={() => run(() => switchMode({ data: { mode: m } }), `Switched to ${m}.`)}
                className={`min-h-9 rounded-full px-4 text-xs font-semibold uppercase tracking-wider disabled:opacity-60 ${
                  s.activeMode === m ? "bg-foreground text-background" : "border border-border"
                }`}
              >
                {m}
              </button>
            ))}
            {!s.sandboxVerified && (
              <span className="text-xs text-muted-foreground">Live unlocks after a sandbox payout completes.</span>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(["sandbox", "live"] as Mode[]).map((m) => {
              const c = s[m];
              return (
                <div key={m} className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{m}</p>
                  {c.connected && editing !== m ? (
                    <>
                      <p className="mt-1 font-medium">Connected ✓</p>
                      <p className="text-xs text-muted-foreground">{c.profileName}</p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => { setEditing(m); setToken(""); }} className="min-h-9 rounded-full border border-border px-4 text-xs font-semibold">Replace</button>
                        <button
                          disabled={busy}
                          onClick={() => window.confirm(`Disconnect Wise ${m}?`) && run(() => disconnect({ data: { mode: m } }), "Disconnected.")}
                          className="min-h-9 rounded-full border border-border px-4 text-xs font-semibold"
                        >
                          Disconnect
                        </button>
                      </div>
                    </>
                  ) : editing === m || !c.connected ? (
                    <form
                      className="mt-2 grid gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          await save({ data: { mode: m, token } });
                          setToken("");
                          setEditing(null);
                        }, `Wise ${m} connected.`);
                      }}
                    >
                      <input
                        type="password"
                        autoComplete="off"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder={`Paste your ${m} API token`}
                        className="min-h-10 rounded-full border border-input bg-background px-4 text-base"
                      />
                      <div className="flex gap-2">
                        <button disabled={busy || token.trim().length < 10} className="min-h-9 rounded-full bg-foreground px-4 text-xs font-semibold text-background disabled:opacity-50">
                          {busy ? "Checking…" : "Connect Wise account"}
                        </button>
                        {c.connected && (
                          <button type="button" onClick={() => setEditing(null)} className="min-h-9 rounded-full border border-border px-4 text-xs font-semibold">Cancel</button>
                        )}
                      </div>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
          {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-foreground" : "text-destructive"}`}>{msg.text}</p>}
          <p className="mt-4 text-xs text-muted-foreground">
            Status updates URL for Wise (Settings → Webhooks, event “Transfer status change”):{" "}
            <span className="break-all font-mono">https://shlm-trading-bloom.lovable.app/api/public/wise-webhook</span>
          </p>
        </div>
      )}
    </section>
  );
}
