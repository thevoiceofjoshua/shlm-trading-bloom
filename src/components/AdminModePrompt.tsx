import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAdminMode } from "@/hooks/use-admin-mode";
import { Button } from "@/components/ui/button";
import { VaultCredentialFrame, VaultField } from "@/components/VaultCredentialFrame";

export function AdminModePrompt() {
  const { isStaff, role, checked, decided, promptRequested, adminMode, enter, dismissPrompt, email } = useAdminMode();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [step, setStep] = useState<"ask" | "passcode">("ask");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!checked || !isStaff || decided || adminMode || (pathname === "/" && !promptRequested)) return null;

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
    <div className="vault-boot fixed inset-0 z-[200] flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto bg-[var(--vault-bg)]/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm xs:px-4 sm:items-center sm:py-6">
      <VaultCredentialFrame className="my-auto min-w-0 w-full max-w-md" label="SHLM // privileged terminal" status={step === "passcode" ? "clearance" : "standby"}>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--vault-accent)]">
          {isMod ? "SHLM MOD" : "SHLM Founder"}
        </p>
        <h2 className="mt-3 font-display text-2xl tracking-normal text-[var(--vault-ink)]">
          {isMod ? "Enter SHLM MOD access?" : "Enter SHLM Founder mode?"}
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-[var(--vault-muted)]">
          {isMod
            ? "SHLM MOD unlocks the full SHLM Centre — boards, analyst, calendar and journal. Program settings, applications and member data stay locked."
            : "SHLM Founder mode unlocks every page and member function across the store so you can test it end to end. Customer-facing actions still ask for confirmation."}
        </p>

        {email && <p className="mt-2 font-sans text-xs text-[var(--vault-muted)]">Signed in as {email}</p>}

        {step === "ask" ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => setStep("passcode")}
              className="min-h-12 flex-1 rounded-sm bg-[var(--vault-accent)] text-[var(--vault-bg)] hover:opacity-90"
            >
              {isMod ? "Enter SHLM MOD" : "Enter SHLM Founder"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={dismissPrompt}
              className="min-h-12 flex-1 rounded-sm border-[var(--vault-line)] bg-transparent text-[var(--vault-ink)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]"
            >
              Continue as member
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <VaultField
              label={isMod ? "SHLM MOD passcode" : "SHLM Founder passcode"}
              id="admin-passcode"
              type="password"
              autoComplete="off"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••••••"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={busy || passcode.trim().length === 0}
                className="min-h-12 flex-1 rounded-sm bg-[var(--vault-accent)] text-[var(--vault-bg)] hover:opacity-90"
              >
                {busy ? "Verifying…" : isMod ? "Unlock SHLM MOD" : "Unlock SHLM Founder"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={dismissPrompt}
                className="min-h-12 flex-1 rounded-sm border-[var(--vault-line)] bg-transparent text-[var(--vault-ink)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]"
              >
                Not now
              </Button>
            </div>
          </form>
        )}
      </VaultCredentialFrame>
    </div>
  );
}
