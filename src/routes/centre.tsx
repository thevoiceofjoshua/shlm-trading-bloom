import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { HomeButton } from "@/components/HomeButton";
import { AccountMenu } from "@/components/AccountMenu";
import type { AuthUser } from "@/hooks/use-auth-user";
import { supabase } from "@/integrations/supabase/client";
import { getHubData, type HubPayload } from "@/lib/hub.functions";
import { SessionBar } from "@/components/hub/SessionBar";
import { IndexCards, MagSevenBoard, DowBoard, GoldDesk } from "@/components/hub/MarketBoards";
import { EconomicCalendar, MorningNewsSpotlight } from "@/components/hub/EconomicCalendar";
import { Journal } from "@/components/hub/Journal";
import { BetaIndicator } from "@/components/hub/BetaIndicator";


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
      { name: "description", content: "Your premium trading command center — NASDAQ, US30, Gold, and economic calendar." },
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
  const [betaOpen, setBetaOpen] = useState(false);


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

  const { viewAsMember, isStaff } = useAdminMode();
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
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link
            to="/dashboard"
            search={{ demo: undefined }}
            className="min-w-0 truncate font-display text-base font-semibold tracking-tight sm:text-xl"
          >
            ← SHLM Centre
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <HomeButton />
            {user?.id && (
              <CentreMenu
                onOpenJournal={() => setJournalOpen(true)}
                onOpenBeta={() => setBetaOpen(true)}
                showBeta={isStaff}
              />
            )}
            {user && <AccountMenu user={user} scrolled={true} variant="desktop" />}
          </div>


        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
        {!payload ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">{isLoading ? "Loading market data…" : "Unable to load hub data."}</p>
          </div>
        ) : !payload.access.hasAccess && !payload.access.isAdmin ? (
          <LockedPreview />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">SHLM Centre</h1>
                <FeedBadges payload={payload} dataUpdatedAt={dataUpdatedAt || Date.now()} />
              </div>
              {payload.access.isAdmin && !payload.access.memberAccess && (
                <div className="shrink-0"><AdminPreviewTag /></div>
              )}
            </div>


            <SessionBar payload={payload} />

            <IndexCards payload={payload} />


            <div className="grid items-stretch gap-6 lg:grid-cols-2">
              <MagSevenBoard payload={payload} />
              <DowBoard payload={payload} />
            </div>


            <GoldDesk payload={payload} />

            <MorningNewsSpotlight payload={payload} />

            <EconomicCalendar payload={payload} />
          </div>
        )}
      </main>

      {journalOpen && user?.id && (
        <div className="fixed inset-0 z-50 flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto bg-background/80 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm xs:p-3 sm:p-6">
          <div className="min-w-0 w-full max-w-5xl">
            <Journal userId={user.id} onClose={() => setJournalOpen(false)} />
          </div>
        </div>
      )}

      {betaOpen && isStaff && (
        <div className="fixed inset-0 z-50 flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto bg-background/80 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm xs:p-3 sm:p-6">
          <div className="min-w-0 w-full max-w-2xl">
            <BetaIndicator onClose={() => setBetaOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function CentreMenu({
  onOpenJournal,
  onOpenBeta,
  showBeta,
}: {
  onOpenJournal: () => void;
  onOpenBeta: () => void;
  showBeta: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:px-4"
      >
        <span className="hidden sm:inline">Member tools</span>
        <span className="sm:hidden">Tools</span>
        <span aria-hidden className="text-[10px]">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenJournal();
            }}
            className="block w-full px-4 py-3 text-left text-sm hover:bg-accent"
          >
            <span className="font-medium">Trading journal</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Calendar, entries and PnL totals
            </span>
          </button>
          {showBeta && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenBeta();
              }}
              className="block w-full border-t border-border px-4 py-3 text-left text-sm hover:bg-accent"
            >
              <span className="font-medium">Beta testing · VIP</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                SHLM SYSTEM TradingView indicator
              </span>
            </button>
          )}
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
        Active SHLM members only. Enroll below to unlock the live trading command center.
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
