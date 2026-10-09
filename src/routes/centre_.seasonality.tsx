import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { HomeButton } from "@/components/HomeButton";
import { SeasonalityView } from "@/components/hub/Seasonality";
import { supabase } from "@/integrations/supabase/client";
import { useAdminMode } from "@/hooks/use-admin-mode";
import { getSeasonality } from "@/lib/seasonality.functions";
import type { SeasonalitySymbol } from "@/lib/seasonality";

export const Route = createFileRoute("/centre_/seasonality")({
  component: SeasonalityPage,
  head: () => ({ meta: [
    { title: "Seasonality — SHLM Centre" },
    { name: "description", content: "Recorded NASDAQ and US30 monthly returns and daily market character for SHLM Centre members." },
    { property: "og:title", content: "Seasonality — SHLM Centre" },
    { property: "og:description", content: "History-based monthly returns and daily session character, with no synthetic figures." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
});

function SeasonalityPage() {
  const [identity, setIdentity] = useState<string | null | undefined>(undefined);
  const [symbol, setSymbol] = useState<SeasonalitySymbol>("NQ");
  const { viewAsMember } = useAdminMode();
  useEffect(() => { let active = true; supabase.auth.getSession().then(({ data }) => { if (active) setIdentity(data.session?.user.id ?? null); }); return () => { active = false; }; }, []);
  const fetchHistory = useServerFn(getSeasonality);
  const query = useQuery({ queryKey: ["seasonality", identity, symbol, viewAsMember], queryFn: () => fetchHistory({ data: { symbol, asMember: viewAsMember } }), enabled: Boolean(identity), retry: false, refetchInterval: 60_000 });
  return <div className="min-h-screen bg-background text-foreground"><header className="border-b border-border"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Link to="/centre" className="font-display font-medium">← SHLM Centre</Link><HomeButton /></div></header><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><h1 className="font-display text-3xl">Seasonality</h1><span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold">NEW</span></div>{query.data?.access.hasAccess && <div className="flex gap-1" aria-label="Symbol">{([["NQ", "NASDAQ (NQ)"], ["YM", "US30 (YM)"]] as const).map(([key, label]) => <Button key={key} variant={symbol === key ? "default" : "outline"} className="rounded-full" aria-pressed={symbol === key} onClick={() => setSymbol(key)}>{label}</Button>)}</div>}</div>
    {identity === undefined || (identity && query.isPending) ? <p className="py-24 text-center text-sm text-muted-foreground">Loading Seasonality…</p> : !identity ? <div className="py-24 text-center"><p className="text-sm text-muted-foreground">Seasonality is for signed-in SHLM Centre members.</p><Button asChild className="mt-5 rounded-full"><Link to="/auth" search={{ mode: "signin", redirect: "/centre/seasonality" }}>Sign in</Link></Button></div> : query.isError ? <div className="py-24 text-center"><p className="text-sm text-muted-foreground">Seasonality history could not be checked.</p><Button variant="outline" className="mt-4" onClick={() => query.refetch()}>Retry</Button></div> : query.data && !query.data.access.hasAccess ? <div className="py-24 text-center"><p className="text-sm text-muted-foreground">Seasonality is for active SHLM Centre members.</p><Button asChild className="mt-5 rounded-full"><Link to="/apply">Apply to enroll</Link></Button></div> : query.data ? <SeasonalityView key={symbol} data={query.data} /> : null}
  </main></div>;
}