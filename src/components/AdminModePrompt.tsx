import { useState } from "react";
import { useAdminMode } from "@/hooks/use-admin-mode";

export function AdminModePrompt() {
  const { isStaff, role, checked, decided, adminMode, enter, dismissPrompt, email } = useAdminMode();
  const [step, setStep] = useState<"ask" | "passcode">("ask");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!checked || !isStaff || decided || adminMode) return null;

  const isMod = role === "shlm_mod";


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await enter(passcode.trim());
      if (!res.ok) {
        setError(res.reason === "bad-passcode" ? "That passcode isn't right." : "This account doesn't have admin access.");
      }
    } catch {
      setError("Couldn't verify the passcode. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {isMod ? "SHLM MOD" : "SHLM Admin"}
        </p>
        <h2 className="mt-3 font-display text-2xl tracking-tight">
          {isMod ? "Enter SHLM MOD access?" : "Enter admin mode?"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {isMod
            ? "SHLM MOD unlocks the full SHLM Centre — boards, analyst, calendar and journal. Program settings, applications and member data stay locked."
            : "Admin mode unlocks every page and member function across the store so you can test it end to end. Customer-facing actions still ask for confirmation."}
        </p>

        {email && <p className="mt-2 text-xs text-muted-foreground">Signed in as {email}</p>}

        {step === "ask" ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep("passcode")}
              className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isMod ? "Enter SHLM MOD" : "Enter admin mode"}
            </button>
            <button
              type="button"
              onClick={dismissPrompt}
              className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-border px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Continue as member
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="admin-passcode">
              {isMod ? "SHLM MOD passcode" : "Admin passcode"}
            </label>
            <input
              id="admin-passcode"
              type="password"
              autoComplete="off"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
              placeholder="••••••••"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={busy || passcode.trim().length === 0}
                className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Verifying…" : isMod ? "Unlock SHLM MOD" : "Unlock admin mode"}
              </button>
              <button
                type="button"
                onClick={dismissPrompt}
                className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-border px-5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Not now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
