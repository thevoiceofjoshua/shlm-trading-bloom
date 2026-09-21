import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  connectTradovate,
  disconnectTradovate,
  listTradovateConnections,
} from "@/lib/tradovate.functions";

/**
 * Per-member Tradovate connections panel. Members can connect several accounts;
 * credentials are posted straight to an authenticated server function, encrypted
 * there, and never read back.
 */
export function TradovateConnect() {
  const qc = useQueryClient();
  const list = useServerFn(listTradovateConnections);
  const connect = useServerFn(connectTradovate);
  const disconnect = useServerFn(disconnectTradovate);

  const { data, isPending } = useQuery({
    queryKey: ["tradovate-connections"],
    queryFn: () => list(),
  });

  const [open, setOpen] = useState(false);
  const [environment, setEnvironment] = useState<"demo" | "live">("live");
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cid, setCid] = useState("");
  const [sec, setSec] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await connect({
        data: {
          environment,
          label,
          username,
          password,
          cid,
          sec,
          appId: "SHLM Journal",
          appVersion: "1.0",
        },
      });
      if (!res.connected) throw new Error(res.error ?? "Could not connect.");
      return res;
    },
    onSuccess: () => {
      setPassword("");
      setSec("");
      setUsername("");
      setCid("");
      setLabel("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["tradovate-connections"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not connect."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => disconnect({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tradovate-connections"] }),
  });

  const connections = data ?? [];

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-medium">Tradovate</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPending
              ? "Checking…"
              : connections.length > 0
                ? `${connections.length} account${connections.length === 1 ? "" : "s"} connected — journal pulls combine all of them.`
                : "Connect your accounts to auto-fill journal trades from your real fills."}
          </p>
        </div>
        <Button className="shrink-0 rounded-full" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : connections.length > 0 ? "Add account" : "Connect"}
        </Button>
      </div>

      {connections.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {connections.map((c) => (
            <li
              key={c.id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.environment === "demo" ? "Demo" : "Live"}
                  {c.accountName ? ` · ${c.accountName}` : ""}
                  {c.lastUsedAt ? ` · last used ${new Date(c.lastUsedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 rounded-full"
                disabled={remove.isPending}
                onClick={() => remove.mutate(c.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form
          className="mt-5 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <p className="text-xs text-muted-foreground">
            From Tradovate&apos;s API Access add-on. Stored encrypted on our server and never shown again.
          </p>
          <div className="flex flex-wrap gap-2">
            {(["live", "demo"] as const).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvironment(env)}
                className={`min-h-9 rounded-full border px-4 text-xs font-medium ${
                  environment === env
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {env === "live" ? "Live" : "Demo"}
              </button>
            ))}
          </div>
          <Field
            label="Label (optional)"
            value={label}
            onValue={setLabel}
            required={false}
            autoComplete="off"
            placeholder="FTMO 50k"
          />
          <Field label="Tradovate username" value={username} onValue={setUsername} autoComplete="off" />
          <Field label="Password" value={password} onValue={setPassword} type="password" autoComplete="new-password" />
          <Field label="CID" value={cid} onValue={setCid} inputMode="numeric" autoComplete="off" />
          <Field label="API secret" value={sec} onValue={setSec} type="password" autoComplete="off" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="rounded-full" disabled={save.isPending}>
            {save.isPending ? "Connecting…" : "Save connection"}
          </Button>
        </form>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onValue,
  required = true,
  ...rest
}: {
  label: string;
  value: string;
  onValue: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {label}
      <input
        {...rest}
        required={required}
        value={value}
        onChange={(e) => onValue(e.target.value)}
        className="mt-1.5 h-11 min-w-0 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground sm:text-sm"
      />
    </label>
  );
}
