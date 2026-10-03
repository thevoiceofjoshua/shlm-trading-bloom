import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <HomeButton />
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Recruiter Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {usd(LAND_RATE)} per member landed · {usd(BONUS_AMOUNT)} bonus for every {BONUS_PER} landed in a calendar month.
        </p>

        <div className="mt-8">
          {!ready || q.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
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
                <RecruiterCard key={r.id} row={r} editable={q.data!.isFounder} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecruiterCard({ row, editable }: { row: RecruiterRow; editable: boolean }) {
  const adjust = useServerFn(adjustRecruiterLands);
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bonus = Math.floor(row.thisMonth / BONUS_PER) * BONUS_AMOUNT;

  const apply = async (delta: number) => {
    if (!delta || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await adjust({ data: { recruiterId: row.id, delta } });
      setAmount("");
      await qc.invalidateQueries({ queryKey: ["recruiter-portal"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
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
    </div>
  );
}
