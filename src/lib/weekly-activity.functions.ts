import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkAccess } from "@/lib/hub.functions";

export const getTodayActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await checkAccess(context);
    if (!access.hasAccess && !access.isAdmin) return { events: [], sessionDate: "" };
    const { sessionDay } = await import("@/lib/weekly-activity.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sessionDate = sessionDay();
    const { data, error } = await supabaseAdmin.from("weekly_behavior_events")
      .select("id, message, kind, created_at")
      .eq("session_date", sessionDate)
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error("Unable to load notifications");
    return { sessionDate, events: data ?? [] };
  });