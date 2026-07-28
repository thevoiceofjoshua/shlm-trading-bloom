import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Member Dashboard — SHLM" },
      { name: "description", content: "Your private SHLM trading mentorship dashboard." },
      { name: "robots", content: "noindex" },
    ],
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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

function DashboardCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-accent">
      <h3 className="font-display text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
