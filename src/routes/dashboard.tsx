import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HomeButton } from "@/components/HomeButton";
import { supabase } from "@/integrations/supabase/client";
import { getMyMembership } from "@/lib/membership.functions";
import { createExtensionCheckoutSession } from "@/lib/checkout.functions";
import { EXTENSION, PROGRAM, addMonths, extensionTotal, formatUsd } from "@/lib/tiers";

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
  const startExtension = useServerFn(createExtensionCheckoutSession);
  const [months, setMonths] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-membership"],
    queryFn: () => fetchMembership({ data: undefined }),
    retry: false,
  });

  const extend = useMutation({
    mutationFn: (m: number) => startExtension({ data: { months: m, origin: window.location.origin } }),
    onSuccess: (res) => {
      if (res?.url) window.location.href = res.url;
    },
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

  if (!data?.enrollment || !data.access) {
    return (
      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-medium tracking-tight">No active plan yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Once your enrollment payment clears, your {PROGRAM.weeks}-week access and purchase history
          will appear here.
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

  const { enrollment, access } = data;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <section className="mt-10 space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your plan
            </p>
            <h2 className="mt-2 font-display text-2xl font-medium tracking-tight">
              {enrollment.name}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{PROGRAM.blurb}</p>
          </div>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-widest">
            {access.active ? "Active" : "Expired"}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Enrolled</dt>
            <dd className="mt-1 text-sm font-medium">{formatDate(enrollment.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Paid</dt>
            <dd className="mt-1 text-sm font-medium">{formatUsd(enrollment.amount_total)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">
              Access through
            </dt>
            <dd className="mt-1 text-sm font-medium">{formatDate(access.endsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Term</dt>
            <dd className="mt-1 text-sm font-medium">
              {PROGRAM.weeks} weeks
              {access.extensionMonths > 0
                ? ` + ${access.extensionMonths} month${access.extensionMonths === 1 ? "" : "s"}`
                : ""}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-muted-foreground">
          {access.active
            ? `${access.daysRemaining} day${access.daysRemaining === 1 ? "" : "s"} of access remaining.`
            : "Your access period has ended — extend below to continue."}
        </p>
      </div>

      {data.purchases.length > 1 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-medium">Purchase history</h3>
          <ul className="mt-4 divide-y divide-border">
            {data.purchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <span>{p.name}</span>
                <span className="text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("en-US")} ·{" "}
                  {formatUsd(p.amount_total ?? PROGRAM.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h3 className="font-display text-xl font-medium tracking-tight">Extend your access</h3>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {formatUsd(EXTENSION.amount)} per month after your initial {PROGRAM.weeks} weeks. Keep your
          mentorship, community and live sessions running for as long as you need.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {[1, 2, 3, 6].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={`min-h-11 rounded-full border px-5 text-sm font-medium transition-colors ${
                months === m
                  ? "border-foreground bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              {m} month{m === 1 ? "" : "s"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          <Row label={`${formatUsd(EXTENSION.amount)} × ${months} month${months === 1 ? "" : "s"}`} value={formatUsd(extensionTotal(months))} />
          <Row label="New access end date" value={formatDate(addMonths(new Date(access.endsAt), months).toISOString())} />
        </div>

        <button
          type="button"
          disabled={extend.isPending}
          onClick={() => extend.mutate(months)}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {extend.isPending
            ? "Opening checkout…"
            : `Extend for ${formatUsd(extensionTotal(months))}`}
        </button>

        {extend.isError && (
          <p className="mt-4 text-sm text-destructive">
            We couldn’t start that extension. Please try again or contact support.
          </p>
        )}
      </div>
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
