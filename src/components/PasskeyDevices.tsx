import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  finishPasskeyRegistration,
  listPasskeys,
  removePasskey,
  startPasskeyRegistration,
} from "@/lib/passkeys.functions";

/** Lets a signed-in member register this device for Face ID / fingerprint sign-in. */
export function PasskeyDevices() {
  const qc = useQueryClient();
  const list = useServerFn(listPasskeys);
  const start = useServerFn(startPasskeyRegistration);
  const finish = useServerFn(finishPasskeyRegistration);
  const remove = useServerFn(removePasskey);

  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const { data } = useQuery({ queryKey: ["passkeys"], queryFn: () => list() });

  const register = useMutation({
    mutationFn: async () => {
      setError(null);
      const { startRegistration } = await import("@simplewebauthn/browser");
      const { optionsJSON } = await start();
      const response = await startRegistration({ optionsJSON: JSON.parse(optionsJSON) });
      const label = /iPhone|iPad|Mac/.test(navigator.userAgent)
        ? "Face ID / Touch ID"
        : /Android/.test(navigator.userAgent)
          ? "Fingerprint"
          : "This device";
      await finish({ data: { response, deviceLabel: label } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passkeys"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "Could not register this device."),
  });

  const drop = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passkeys"] }),
  });

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-medium">Face ID / fingerprint sign-in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {supported
              ? "Register this device to sign in without typing your password."
              : "This device doesn't support Face ID or fingerprint sign-in."}
          </p>
        </div>
        {supported && (
          <Button
            className="shrink-0 rounded-full"
            disabled={register.isPending}
            onClick={() => register.mutate()}
          >
            {register.isPending ? "Waiting…" : "Add this device"}
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {(data ?? []).length > 0 && (
        <ul className="mt-4 grid gap-2">
          {(data ?? []).map((p) => (
            <li
              key={p.id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.deviceLabel}</span>
                <span className="block text-xs text-muted-foreground">
                  Added {new Date(p.createdAt).toLocaleDateString()}
                  {p.lastUsedAt ? ` · last used ${new Date(p.lastUsedAt).toLocaleDateString()}` : ""}
                </span>
              </span>
              <Button
                variant="ghost"
                className="shrink-0 rounded-full text-xs"
                disabled={drop.isPending}
                onClick={() => drop.mutate(p.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
