import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HomeButton } from "@/components/HomeButton";
import { supabase } from "@/integrations/supabase/client";
import {
  adjustRecruiterLands,
  getRecruiterPortal,
  LAND_RATE,
  BONUS_PER,
  BONUS_AMOUNT,
  type RecruiterRow,
} from "@/lib/recruiters.functions";
import { getPayoutSummary, type PayoutSummary } from "@/lib/payouts.functions";
import { FounderPayoutPanel, RecruiterPayoutPanel } from "@/components/RecruiterPayouts";

export const Route = createFileRoute("/recruiters")({
  component: RecruitersPage,
  head: () => ({
    meta: [
      { title: "Recruiter Portal — SHLM" },
      { name: "description", content: "Track recruiter results: members landed, earnings and monthly bonuses." },
      { property: "og:title", content: "Recruiter Portal — SHLM" },
      { property: "og:description", content: "SHLM recruiter results and monthly bonuses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function RecruitersPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const fetchPortal = useServerFn(getRecruiterPortal);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", redirect: "/recruiters" } as any, replace: true });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  const q = useQuery({
    queryKey: ["recruiter-portal"],
    queryFn: () => fetchPortal(),
    enabled: ready,
    retry: (n, e) => n < 2 && !(e instanceof Error && e.message.includes("NOT_AUTHORIZED")),
  });
  const fetchPayouts = useServerFn(getPayoutSummary);
  const pq = useQuery({
    queryKey: ["payout-summary"],
    queryFn: () => fetchPayouts(),
    enabled: ready && q.isSuccess,
    retry: 1,
  });

  // Live updates: refresh portal + payouts the moment lands/payouts change.
  const liveQc = useQueryClient();
  useEffect(() => {
    if (!ready) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        liveQc.invalidateQueries({ queryKey: ["recruiter-portal"] });
        liveQc.invalidateQueries({ queryKey: ["payout-summary"] });
      }, 300);
    };
    const channel = supabase
      .channel("recruiter-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "recruiter_lands" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "recruiter_payouts" }, refresh)
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [ready, liveQc]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <HomeButton />
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Recruiter Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {usd(LAND_RATE)} per member landed · {usd(BONUS_AMOUNT)} bonus for every {BONUS_PER} landed in a calendar month.
        </p>

        <Accordion type="single" collapsible className="mt-4 w-full rounded-3xl border border-border bg-card px-5">
          <AccordionItem value="how-this-works" className="border-b-0">
            <AccordionTrigger className="font-display text-base font-semibold hover:no-underline">
              How this works
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <p className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                How you get paid
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">$100 per client landed.</span> You earn {usd(LAND_RATE)} for every
                  client you land — a one-time payment per client, not recurring or monthly. Landing one client pays you {usd(LAND_RATE)}{" "}
                  one time, period.
                </li>
                <li>
                  <span className="font-semibold text-foreground">{usd(BONUS_AMOUNT)} monthly bonus, stacking.</span> Land{" "}
                  {BONUS_PER} clients within a single calendar month and you earn an extra one-time bonus of {usd(BONUS_AMOUNT)} for
                  that month. Land {BONUS_PER * 2} in the same month and that's another {usd(BONUS_AMOUNT)} ({usd(BONUS_AMOUNT * 2)}{" "}
                  total bonus for the month), and it keeps stacking for every additional {BONUS_PER} landed in that same month.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Lifetime never resets.</span> Your lifetime landed count and lifetime
                  earnings keep growing forever and never reset. Only the "this month" count (used for the bonus) resets to 0 at the
                  start of each new calendar month.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-8">
          {!ready || q.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : q.isError && !(q.error instanceof Error && q.error.message.includes("NOT_AUTHORIZED")) ? (
            <div className="rounded-3xl border border-border p-8 text-center">
              <p className="font-display text-lg font-semibold">Couldn't load the portal</p>
              <p className="mt-1 text-sm text-muted-foreground">{q.error instanceof Error ? q.error.message : "Please refresh."}</p>
            </div>
          ) : q.isError ? (
            <div className="rounded-3xl border border-border p-8 text-center">
              <p className="font-display text-lg font-semibold">Not authorized</p>
              <p className="mt-1 text-sm text-muted-foreground">This page is for recruiters and the Founder only.</p>
            </div>
          ) : q.data && q.data.rows.length === 0 ? (
            <p className="rounded-3xl border border-border p-8 text-center text-sm text-muted-foreground">
              No recruiters yet. Assign the Recruiter role in the admin panel's Manage roles section.
            </p>
          ) : (
            <div className="grid gap-4">
              {q.data?.rows.map((r) => (
                <RecruiterCard
                  key={r.id}
                  row={r}
                  editable={q.data!.isFounder}
                  payout={pq.data?.rows.find((x) => x.recruiterId === r.id)}
                  mode={pq.data?.mode ?? "sandbox"}
                  connected={!!pq.data?.connected}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecruiterCard({
  row,
  editable,
  payout,
  mode,
  connected,
}: {
  row: RecruiterRow;
  editable: boolean;
  payout?: PayoutSummary;
  mode: string;
  connected: boolean;
}) {
  const adjust = useServerFn(adjustRecruiterLands);
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const busy = false;
  const [err, setErr] = useState<string | null>(null);
  const pending = useRef(0);
  const bonus = Math.floor(row.thisMonth / BONUS_PER) * BONUS_AMOUNT;

  const shift = (delta: number) => {
    qc.setQueryData(["recruiter-portal"], (old: any) =>
      old
        ? {
            ...old,
            rows: old.rows.map((r: RecruiterRow) =>
              r.id === row.id ? { ...r, lifetime: r.lifetime + delta, thisMonth: r.thisMonth + delta } : r,
            ),
          }
        : old,
    );
    const before = Math.floor(Math.max(0, row.thisMonth) / BONUS_PER);
    const after = Math.floor(Math.max(0, row.thisMonth + delta) / BONUS_PER);
    const cents = delta * LAND_RATE * 100 + (after - before) * BONUS_AMOUNT * 100;
    qc.setQueryData(["payout-summary"], (old: any) =>
      old
        ? {
            ...old,
            rows: old.rows.map((p: PayoutSummary) =>
              p.recruiterId === row.id
                ? { ...p, earnedCents: p.earnedCents + cents, owedCents: p.owedCents + cents }
                : p,
            ),
          }
        : old,
    );
  };

  const apply = async (delta: number) => {
    if (!delta) return;
    setErr(null);
    setAmount("");
    await Promise.all([
      qc.cancelQueries({ queryKey: ["recruiter-portal"] }),
      qc.cancelQueries({ queryKey: ["payout-summary"] }),
    ]);
    shift(delta); // optimistic
    pending.current += 1;
    try {
      await adjust({ data: { recruiterId: row.id, delta } });
    } catch (e) {
      shift(-delta); // roll back just this change
      setErr(e instanceof Error ? e.message : "Update failed — change undone");
    } finally {
      pending.current -= 1;
      if (pending.current === 0) {
        qc.invalidateQueries({ queryKey: ["recruiter-portal"] });
        qc.invalidateQueries({ queryKey: ["payout-summary"] });
      }
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{row.name}</h2>
        {bonus > 0 && (
          <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
            Bonus earned: {usd(bonus)}
          </span>
        )}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Landed (lifetime)</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {row.lifetime} <span className="text-base font-medium text-muted-foreground">· Earned {usd(row.lifetime * LAND_RATE)}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">This month</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {row.thisMonth}{" "}
            <span className="text-base font-medium text-muted-foreground">
              · {BONUS_PER - (row.thisMonth % BONUS_PER)} to next bonus
            </span>
          </p>
        </div>
      </div>
      {editable && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => apply(-1)} className="h-10 rounded-full border border-border px-4 text-sm font-semibold hover:bg-accent disabled:opacity-50">−1</button>
          <button type="button" disabled={busy} onClick={() => apply(1)} className="h-10 rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50">+1</button>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Add…"
            className="h-10 w-24 rounded-full border border-border bg-background px-4 text-base"
          />
          <button type="button" disabled={busy || !parseInt(amount, 10)} onClick={() => apply(parseInt(amount, 10))} className="h-10 rounded-full border border-border px-4 text-sm font-semibold hover:bg-accent disabled:opacity-50">Add</button>
          {err && <span className="text-sm text-destructive">{err}</span>}
        </div>
      )}
      {payout &&
        (editable ? (
          <FounderPayoutPanel s={payout} name={row.name} mode={mode} connected={connected} />
        ) : (
          <RecruiterPayoutPanel s={payout} mode={mode} connected={connected} />
        ))}
    </div>
  );
}
