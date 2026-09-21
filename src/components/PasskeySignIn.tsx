import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { finishPasskeyLogin, startPasskeyLogin } from "@/lib/passkeys.functions";

/**
 * Face ID / fingerprint sign-in. Rendered only on devices that expose a
 * platform authenticator; email/password and Google sign-in are untouched.
 */
export function PasskeySignIn({
  onSignedIn,
  className,
}: {
  onSignedIn: () => void;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = useServerFn(startPasskeyLogin);
  const finish = useServerFn(finishPasskeyLogin);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { platformAuthenticatorIsAvailable } = await import("@simplewebauthn/browser");
        const ok = await platformAuthenticatorIsAvailable();
        if (active) setSupported(ok);
      } catch {
        if (active) setSupported(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!supported) return null;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const { optionsJSON } = await start();
      const response = await startAuthentication({ optionsJSON: JSON.parse(optionsJSON) });
      const { tokenHash, email } = await finish({ data: { response } });
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token_hash: tokenHash,
        type: "email",
      });
      if (verifyError) throw verifyError;
      onSignedIn();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Biometric sign-in failed.";
      setError(message.includes("NotAllowed") ? "Biometric prompt cancelled." : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        onClick={run}
        disabled={busy}
        className="h-11 w-full rounded-sm border-[var(--vault-line)] bg-transparent text-[var(--vault-ink)] hover:bg-[var(--vault-line)] hover:text-[var(--vault-ink)]"
      >
        {busy ? "Waiting for device…" : "Sign in with Face ID / fingerprint"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
