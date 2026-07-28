import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type SiteStats = {
  performance_value: string;
  performance_note: string;
  cohort_value: string;
  cohort_label: string;
  results_value: string;
  results_label: string;
  hero_note: string;
  updated_at: string;
};

const DEFAULTS: SiteStats = {
  performance_value: "Tracking",
  performance_note:
    "Verified member results tracked live from July 2026 — real numbers, published as they happen.",
  cohort_value: "New",
  cohort_label: "Cohort now enrolling",
  results_value: "Live",
  results_label: "Results tracked from day one",
  hero_note: "New cohort now enrolling — results tracked live from day one",
  updated_at: new Date().toISOString(),
};

function serverPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getSiteStats = createServerFn({ method: "GET" }).handler(async (): Promise<SiteStats> => {
  const supabase = serverPublicClient();
  const { data } = await supabase
    .from("site_stats")
    .select("performance_value,performance_note,cohort_value,cohort_label,results_value,results_label,hero_note,updated_at")
    .eq("id", 1)
    .maybeSingle();
  return (data as SiteStats | null) ?? DEFAULTS;
});

export const updateSiteStats = createServerFn({ method: "POST" })
  .inputValidator((data: { passcode: string; stats: Partial<Omit<SiteStats, "updated_at">> }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSCODE;
    if (!expected || data.passcode !== expected) {
      throw new Error("Invalid passcode");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Partial<SiteStats> = {};
    const fields: (keyof Omit<SiteStats, "updated_at">)[] = [
      "performance_value",
      "performance_note",
      "cohort_value",
      "cohort_label",
      "results_value",
      "results_label",
      "hero_note",
    ];
    for (const f of fields) {
      const v = data.stats[f];
      if (typeof v === "string" && v.trim().length > 0) patch[f] = v.trim();
    }
    patch.updated_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("site_stats").update(patch).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
