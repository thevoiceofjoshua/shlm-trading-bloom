import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  confirmPayout,
  getBankRequirements,
  quotePayout,
  saveBankAccount,
  simulateSandboxPayout,
  type PayoutSummary,
  type ReqType,
} from "@/lib/payouts.functions";

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  awaiting_funding: "Awaiting approval in Wise",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function ModeBadge({ mode }: { mode: string }) {
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
      {mode}
    </span>
  );
}

function BankLine({ bank }: { bank: PayoutSummary["bank"] }) {
  if (!bank) return null;
  return (
    <span>
      {bank.bankName ?? bank.holderName}
      {bank.last4 ? ` ••••${bank.last4}` : ""} · {bank.currency}
    </span>
  );
}

function History({ s, founder, mode }: { s: PayoutSummary; founder: boolean; mode: string }) {
  const qc = useQueryClient();
  const simulate = useServerFn(simulateSandboxPayout);
  const [busy, setBusy] = useState<string | null>(null);
  if (s.history.length === 0) return <p className="mt-2 text-sm text-muted-foreground">No payouts yet.</p>;
  return (
    <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
      {s.history.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <div>
            <p className="font-medium">
              {money(p.amountCents)}
              {p.targetCurrency && p.targetCurrency !== "USD" && p.targetAmount != null
                ? ` → ${p.targetAmount.toLocaleString("en-US")} ${p.targetCurrency}`
                : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(p.createdAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" })}
              {p.error ? ` · ${p.error}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${p.status === "failed" ? "text-destructive" : ""}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
            {founder && mode === "sandbox" && p.status === "processing" && (
              <button
                disabled={busy === p.id}
                onClick={async () => {
                  setBusy(p.id);
                  try {
                    await simulate({ data: { payoutId: p.id } });
                  } finally {
                    setBusy(null);
                    qc.invalidateQueries({ queryKey: ["payout-summary"] });
                  }
                }}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
              >
                {busy === p.id ? "Simulating…" : "Simulate completion"}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Founder: owed + pay ---------- */

export function FounderPayoutPanel({ s, name, mode, connected }: { s: PayoutSummary; name: string; mode: string; connected: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Payouts</p>
          <ModeBadge mode={mode} />
        </div>
        <button
          disabled={!connected || !s.bank || s.owedCents < 100}
          onClick={() => setOpen(true)}
          className="min-h-10 rounded-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-40"
        >
          Pay recruiter
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div><p className="text-xs text-muted-foreground">Earned</p><p className="font-semibold">{money(s.earnedCents)}</p></div>
        <div><p className="text-xs text-muted-foreground">Paid out</p><p className="font-semibold">{money(s.paidCents)}</p></div>
        <div><p className="text-xs text-muted-foreground">Owed</p><p className="font-semibold">{money(s.owedCents)}</p></div>
      </div>
      {s.inFlightCents > 0 && <p className="mt-1 text-xs text-muted-foreground">{money(s.inFlightCents)} in progress.</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        {!connected ? "Connect Wise in the admin area to send payouts." : s.bank ? <>Bank: <BankLine bank={s.bank} /></> : "No bank account added yet."}
      </p>
      <History s={s} founder mode={mode} />
      {open && <PayDialog s={s} name={name} mode={mode} onClose={() => setOpen(false)} />}
    </div>
  );
}

function PayDialog({ s, name, mode, onClose }: { s: PayoutSummary; name: string; mode: string; onClose: () => void }) {
  const qc = useQueryClient();
  const getQuote = useServerFn(quotePayout);
  const send = useServerFn(confirmPayout);
  const [amount, setAmount] = useState((s.owedCents / 100).toFixed(2));
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof getQuote>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const cents = Math.round(Number(amount) * 100);
  const valid = Number.isFinite(cents) && cents >= 100 && cents <= s.owedCents;
  const expired = quote?.expiresAt ? new Date(quote.expiresAt).getTime() < Date.now() : false;

  const fetchQuote = async () => {
    setBusy(true);
    setErr(null);
    setQuote(null);
    try {
      setQuote(await getQuote({ data: { recruiterId: s.recruiterId, amountCents: cents } }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't get a quote");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!quote) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await send({ data: { recruiterId: s.recruiterId, amountCents: cents, quoteId: quote.quoteId } });
      setDone(r.status === "awaiting_funding" ? "Transfer created. Approve it in the Wise app to send it." : "Payout sent to Wise.");
      qc.invalidateQueries({ queryKey: ["payout-summary"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Payout failed");
      qc.invalidateQueries({ queryKey: ["payout-summary"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-background/90 p-3 sm:items-center">
      <div className="my-auto w-full max-w-md rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Pay {name}</h3>
          <ModeBadge mode={mode} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground"><BankLine bank={s.bank} /></p>

        {done ? (
          <>
            <p className="mt-5 text-sm">{done}</p>
            <button onClick={onClose} className="mt-5 min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background">Close</button>
          </>
        ) : (
          <>
            <label className="mt-5 block text-xs uppercase tracking-wider text-muted-foreground">Amount (USD)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setQuote(null); }}
              className="mt-1 h-11 w-full rounded-full border border-border bg-background px-4 text-base"
            />
            <p className="mt-1 text-xs text-muted-foreground">Owed: {money(s.owedCents)}</p>

            {quote && (
              <dl className="mt-4 grid grid-cols-2 gap-y-1 rounded-2xl border border-border p-4 text-sm">
                <dt className="text-muted-foreground">Sending</dt><dd className="text-right font-semibold">{money(cents)}</dd>
                {quote.fee != null && (<><dt className="text-muted-foreground">Wise fee</dt><dd className="text-right">${Number(quote.fee).toFixed(2)}</dd></>)}
                <dt className="text-muted-foreground">Taken from balance</dt><dd className="text-right">${Number(quote.sourceAmount).toFixed(2)}</dd>
                {quote.targetAmount != null && (<><dt className="text-muted-foreground">Recruiter receives</dt><dd className="text-right font-semibold">{Number(quote.targetAmount).toLocaleString("en-US")} {quote.targetCurrency}</dd></>)}
                {quote.rate != null && quote.targetCurrency !== "USD" && (<><dt className="text-muted-foreground">Rate</dt><dd className="text-right">{quote.rate}</dd></>)}
              </dl>
            )}
            {expired && <p className="mt-2 text-sm text-destructive">This quote expired — refresh it.</p>}
            {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

            <div className="mt-5 flex flex-wrap gap-2">
              {!quote || expired ? (
                <button disabled={busy || !valid} onClick={fetchQuote} className="min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50">
                  {busy ? "Getting quote…" : quote ? "Refresh quote" : "Get quote"}
                </button>
              ) : (
                <button disabled={busy} onClick={confirm} className="min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50">
                  {busy ? "Sending…" : "Confirm & Send"}
                </button>
              )}
              <button disabled={busy} onClick={onClose} className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Recruiter: bank + history ---------- */

const CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD", "MXN", "INR", "NGN", "PHP", "BRL", "JPY", "SGD", "NZD", "ZAR"];

export function RecruiterPayoutPanel({ s, mode, connected }: { s: PayoutSummary; mode: string; connected: boolean }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="mt-4 grid gap-4">
      <div className="rounded-2xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Payout bank account</p>
          {connected && !adding && (
            <button onClick={() => setAdding(true)} className="min-h-9 rounded-full border border-border px-4 text-xs font-semibold">
              {s.bank ? "Replace" : "Add bank account"}
            </button>
          )}
        </div>
        {!connected ? (
          <p className="mt-2 text-sm text-muted-foreground">Payouts aren't set up yet.</p>
        ) : adding ? (
          <BankForm onDone={() => setAdding(false)} />
        ) : s.bank ? (
          <p className="mt-2 text-sm font-medium"><BankLine bank={s.bank} /> · {s.bank.holderName}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Add your bank details so you can be paid.</p>
        )}
      </div>
      <div className="rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Payout history</p>
          {mode === "sandbox" && <ModeBadge mode={mode} />}
        </div>
        <p className="mt-2 text-sm">Paid out: <span className="font-semibold">{money(s.paidCents)}</span>{s.inFlightCents > 0 ? ` · ${money(s.inFlightCents)} on the way` : ""}</p>
        <History s={s} founder={false} mode={mode} />
      </div>
    </div>
  );
}

function BankForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const getReqs = useServerFn(getBankRequirements);
  const save = useServerFn(saveBankAccount);
  const [currency, setCurrency] = useState("");
  const [types, setTypes] = useState<ReqType[]>([]);
  const [type, setType] = useState("");
  const [holder, setHolder] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (cur: string, t?: string, details?: Record<string, string>) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await getReqs({ data: { currency: cur, type: t, details } });
      setTypes(r.types);
      if (!t) setType(r.types[0]?.type ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load the form");
    } finally {
      setBusy(false);
    }
  };

  const current = types.find((t) => t.type === type);
  const fields = (current?.fields ?? []).filter((f) => f.key !== "legalType" || true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await save({ data: { currency, type, holderName: holder, details: values } });
      setValues({});
      await qc.invalidateQueries({ queryKey: ["payout-summary"] });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  const input = "mt-1 h-11 w-full rounded-full border border-border bg-background px-4 text-base";
  return (
    <form onSubmit={submit} className="mt-3 grid gap-3" autoComplete="off">
      <label className="text-xs text-muted-foreground">
        Currency you want to receive
        <select
          className={input}
          value={currency}
          onChange={(e) => { setCurrency(e.target.value); setValues({}); setTypes([]); if (e.target.value) load(e.target.value); }}
        >
          <option value="">Choose…</option>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      {types.length > 1 && (
        <label className="text-xs text-muted-foreground">
          Account type
          <select className={input} value={type} onChange={(e) => { setType(e.target.value); setValues({}); }}>
            {types.map((t) => <option key={t.type} value={t.type}>{t.title}</option>)}
          </select>
        </label>
      )}
      {current && (
        <>
          <label className="text-xs text-muted-foreground">
            Account holder's full name
            <input className={input} value={holder} onChange={(e) => setHolder(e.target.value)} required />
          </label>
          {fields.map((f) => (
            <label key={f.key} className="text-xs text-muted-foreground">
              {f.name}{f.required ? "" : " (optional)"}
              {f.options && f.options.length > 0 ? (
                <select
                  className={input}
                  required={f.required}
                  value={values[f.key] ?? ""}
                  onChange={(e) => {
                    const next = { ...values, [f.key]: e.target.value };
                    setValues(next);
                    if (f.refresh) load(currency, type, next);
                  }}
                >
                  <option value="">Choose…</option>
                  {f.options.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
                </select>
              ) : (
                <input
                  className={input}
                  required={f.required}
                  placeholder={f.example}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  onBlur={() => f.refresh && values[f.key] && load(currency, type, values)}
                />
              )}
            </label>
          ))}
        </>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <p className="text-xs text-muted-foreground">Your details go straight to Wise. We only keep the bank name and last 4 digits.</p>
      <div className="flex gap-2">
        <button disabled={busy || !current} className="min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50">
          {busy ? "Working…" : "Save bank account"}
        </button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold">Cancel</button>
      </div>
    </form>
  );
}
