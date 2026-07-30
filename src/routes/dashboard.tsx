import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HomeButton } from "@/components/HomeButton";
import { supabase } from "@/integrations/supabase/client";
import { createUpgradeCheckout, getMyMembership } from "@/lib/upgrade.functions";
import { TERM_MONTHS, TIERS, formatUsd, type TierKey, type UpgradeQuote } from "@/lib/tiers";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Member Dashboard — SHLM" },
      { name: "description", content: "Your private SHLM trading mentorship dashboard." },
      { property: "og:title", content: "Member Dashboard — SHLM" },
      { property: "og:description", content: "Your private SHLM trading mentorship dashboard." },
      { property: "og:url", content: "https://shlm-trading-bloom.lovable.app/dashboard" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/dashboard" }],
  }),
});

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email?: string | null; name?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", redirect: "/dashboard" }, replace: true });
        return;
      }
      setUser({
        email: data.session.user.email,
        name: data.session.user.user_metadata?.full_name ?? data.session.user.user_metadata?.name ?? null,
      });
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">
            SHLM
          </Link>
          <div className="flex items-center gap-3">
            <HomeButton />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/", replace: true }))}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your private SHLM member dashboard is being built out. New modules will appear here as the program grows.
        </p>

        <MembershipPanel />

        <h2 className="mt-12 font-display text-xl font-medium tracking-tight text-foreground">
          Your member modules
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard title="Curriculum" description="Access your breakout strategy lessons and weekly modules." />
          <DashboardCard title="Mentorship Calls" description="Book and review your live sessions with mentors." />
          <DashboardCard title="Community" description="Join the private Discord and connect with the cohort." />
          <DashboardCard title="Resources" description="Playbooks, checklists, and trade planning templates." />
          <DashboardCard title="Settings" description="Manage your membership, billing, and profile." />
          <DashboardCard title="Support" description="Reach out to the SHLM team for help." />
        </div>
      </main>
    </div>
  );
}

function MembershipPanel() {
  const fetchMembership = useServerFn(getMyMembership);
  const startUpgrade = useServerFn(createUpgradeCheckout);
  const [pendingTier, setPendingTier] = useState<TierKey | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-membership"],
    queryFn: () => fetchMembership({ data: undefined }),
    retry: false,
  });

  const upgrade = useMutation({
    mutationFn: (to: TierKey) =>
      startUpgrade({ data: { to, origin: window.location.origin } }),
    onSuccess: (res) => {
      if (res?.url) window.location.href = res.url;
      else setPendingTier(null);
    },
    onError: () => setPendingTier(null),
  });

  if (isLoading) {
    return (
      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading your membership…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          We couldn’t load your membership right now. Refresh the page or contact support.
        </p>
      </section>
    );
  }

  if (!data?.current) {
    return (
      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-medium tracking-tight">No active plan yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Once your enrollment payment clears, your plan and purchase history will appear here.
        </p>
        <Link
          to="/apply"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Apply to enroll
        </Link>
      </section>
    );
  }

  const current = data.current;
  const info = TIERS[current.tier];

  return (
    <section className="mt-10 space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your plan
            </p>
            <h2 className="mt-2 font-display text-2xl font-medium tracking-tight">{info.name}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{info.blurb}</p>
          </div>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-widest">
            Active
          </span>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Purchased</dt>
            <dd className="mt-1 text-sm font-medium">
              {new Date(current.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Paid</dt>
            <dd className="mt-1 text-sm font-medium">
              {formatUsd(data.purchases.find((p) => p.id === current.id)?.amount_total ?? info.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Term progress</dt>
            <dd className="mt-1 text-sm font-medium">
              {data.upgrades[0]
                ? `${data.upgrades[0].monthsUsed} of ${TERM_MONTHS} months`
                : `${TERM_MONTHS}-month program`}
            </dd>
          </div>
        </dl>
      </div>

      {data.purchases.length > 1 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-medium">Purchase history</h3>
          <ul className="mt-4 divide-y divide-border">
            {data.purchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <span>{TIERS[p.tier].name}</span>
                <span className="text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("en-US")} ·{" "}
                  {formatUsd(p.amount_total ?? TIERS[p.tier].amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.upgrades.length > 0 && (
        <div>
          <h3 className="font-display text-xl font-medium tracking-tight">Upgrade your access</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.upgrades[0]?.prorated
              ? `Prorated pricing — you’re credited for the months of ${info.name} you haven’t used yet. Available for the first ${data.upgrades[0].prorationWindowDays} days after purchase.`
              : `Your ${data.upgrades[0]?.prorationWindowDays ?? 42}-day proration window has passed, so upgrades are at full price.`}
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {data.upgrades.map((q: UpgradeQuote) => (
              <div key={q.to} className="rounded-2xl border border-border bg-card p-6">
                <h4 className="font-display text-lg font-medium">{TIERS[q.to].name}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{TIERS[q.to].blurb}</p>

                <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                  <Row label={`${TIERS[q.to].name} full price`} value={formatUsd(q.targetAmount)} />
                  {q.prorated && (
                    <Row
                      label={`Credit · ${q.monthsRemaining} of ${TERM_MONTHS} months unused`}
                      value={`− ${formatUsd(q.credit)}`}
                    />
                  )}
                  <div className="flex items-baseline justify-between border-t border-border pt-3">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      {q.prorated ? "Prorated today" : "Due today"}
                    </span>
                    <span className="font-display text-2xl font-medium">{formatUsd(q.amountDue)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={upgrade.isPending}
                  onClick={() => {
                    setPendingTier(q.to);
                    upgrade.mutate(q.to);
                  }}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {upgrade.isPending && pendingTier === q.to
                    ? "Opening checkout…"
                    : `Upgrade for ${formatUsd(q.amountDue)}`}
                </button>
              </div>
            ))}
          </div>
          {upgrade.isError && (
            <p className="mt-4 text-sm text-destructive">
              We couldn’t start that upgrade. Please try again or contact support.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DashboardCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-accent">
      <h3 className="font-display text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
