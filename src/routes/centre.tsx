import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { HomeButton } from "@/components/HomeButton";
import { AccountMenu } from "@/components/AccountMenu";
import type { AuthUser } from "@/hooks/use-auth-user";
import { supabase } from "@/integrations/supabase/client";
import { getHubData, type HubPayload } from "@/lib/hub.functions";
import { SessionBar } from "@/components/hub/SessionBar";
import { IndexCards, MagSevenBoard, DowBoard, GoldDesk } from "@/components/hub/MarketBoards";
import { EconomicCalendar } from "@/components/hub/EconomicCalendar";
import { Journal } from "@/components/hub/Journal";
import { SessionAnalyst } from "@/components/hub/SessionAnalyst";
import { AdminPreviewTag } from "@/components/AdminBar";
import { useAdminMode } from "@/hooks/use-admin-mode";

function deriveHeaderUser(
  id: string,
  email: string | null | undefined,
  name: string | null | undefined,
): AuthUser {
  const display = (name ?? email?.split("@")[0] ?? "there").trim();
  const parts = display.split(/[\s._\-+0-9]+/).filter(Boolean);
  const firstName = parts[0] ?? display;
  const initials =
    (parts[0]?.[0]?.toUpperCase() ?? "") +
    (parts.length > 1 ? (parts[parts.length - 1]?.[0]?.toUpperCase() ?? "") : "");
  return {
    id,
    email: email ?? null,
    name: name ?? null,
    firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
    initials: initials || (email?.[0]?.toUpperCase() ?? "U"),
  };
}

export const Route = createFileRoute("/centre")({
  component: CentrePage,
  head: () => ({
    meta: [
      { title: "SHLM Centre — SHLM" },
      { name: "description", content: "Your premium trading command center — NASDAQ, US30, Gold, economic calendar, and AI session analysis." },
      { property: "og:title", content: "SHLM Centre — SHLM" },
      { property: "og:description", content: "Premium trading command center for SHLM members." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CentrePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [journalOpen, setJournalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", redirect: "/centre" }, replace: true });
        return;
      }
      setUser(
        deriveHeaderUser(
          data.session.user.id,
          data.session.user.email,
          (data.session.user.user_metadata?.full_name ?? data.session.user.user_metadata?.name) as string | undefined,
        ),
      );
      setLoading(false);
    });
  }, [navigate]);

  const { viewAsMember } = useAdminMode();
  const fetchHub = useServerFn(getHubData);
  const { data: payload, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["hub-data", viewAsMember],
    queryFn: () => fetchHub({ data: { asMember: viewAsMember } }),
    enabled: !loading,
    retry: false,
    // Delayed feed: keep the boards moving without hammering the free source.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading SHLM Centre…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" search={{ demo: undefined }} className="font-display text-xl font-semibold tracking-tight">
            ← SHLM Centre
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <HomeButton />
            {user?.id && (
              <button
                type="button"
                onClick={() => setJournalOpen(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <span className="hidden sm:inline">Open journal</span>
                <span className="sm:hidden">Journal</span>
              </button>
            )}
            {user && <AccountMenu user={user} scrolled={true} variant="desktop" />}
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!payload ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">{isLoading ? "Loading market data…" : "Unable to load hub data."}</p>
          </div>
        ) : !payload.access.hasAccess && !payload.access.isAdmin ? (
          <LockedPreview />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-3xl font-medium tracking-tight">SHLM Centre</h1>
                <FeedBadges payload={payload} dataUpdatedAt={dataUpdatedAt || Date.now()} />
              </div>
              {payload.access.isAdmin && !payload.access.memberAccess && <AdminPreviewTag />}
            </div>

            <SessionBar payload={payload} />

            <SessionAnalyst payload={payload} />

            <IndexCards payload={payload} />

            <div className="grid gap-6 lg:grid-cols-2">
              <MagSevenBoard payload={payload} />
              <DowBoard payload={payload} />
            </div>

            <GoldDesk payload={payload} />

            <EconomicCalendar payload={payload} />
          </div>
        )}
      </main>

      {journalOpen && user?.id && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="w-full max-w-5xl">
            <Journal userId={user.id} onClose={() => setJournalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function LockedPreview() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="font-display text-2xl font-medium tracking-tight">SHLM Centre is a members-only hub</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The SHLM Centre is available to active SHLM mentorship members. Once your enrollment payment clears, you'll get full access to the live trading command center.
      </p>
      <Link
        to="/apply"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Apply to enroll
      </Link>
      <Link to="/dashboard" search={{ demo: undefined }} className="mt-4 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Back to dashboard
      </Link>
    </div>
  );
}

const REFETCH_MS = 60_000;

function FeedBadges({ payload, dataUpdatedAt }: { payload: HubPayload; dataUpdatedAt: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const last = payload.fetchedAt ? new Date(payload.fetchedAt).getTime() : dataUpdatedAt;
  const remaining = Math.max(0, last + REFETCH_MS - now);
  const nextText = remaining === 0 ? "Updating…" : `Next update in ${remaining < 60_000 ? `${Math.ceil(remaining / 1000)}s` : `${Math.floor(remaining / 60_000)}m ${Math.ceil((remaining % 60_000) / 1000)}s`}`;
  const timeText = new Date(last).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
      {payload.dataState === "delayed" && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Delayed live
        </span>
      )}
      {payload.dataState === "sample" && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5">
          Sample data
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5">
        Updated {timeText}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5">
        {nextText}
      </span>
      {payload.dataState === "delayed" && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5">
          ~15 min behind
        </span>
      )}
    </div>
  );
}
