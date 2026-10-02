import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkAccess, type HubAccess } from "@/lib/hub.functions";
import type { WeeklyBehaviorPayload } from "@/lib/weekly-behavior.server";

export type WeeklyResponse = { access: HubAccess; data: WeeklyBehaviorPayload | null };

export const getWeeklyBehavior = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({ asMember: (data as any)?.asMember === true }))
  .handler(async ({ context, data }): Promise<WeeklyResponse> => {
    const r = await checkAccess(context);
    const access: HubAccess = data.asMember
      ? { hasAccess: r.memberAccess, isAdmin: false, memberAccess: r.memberAccess }
      : r;
    if (!access.hasAccess && !access.isAdmin) return { access, data: null };
    try {
      const { computeWeeklyBehavior } = await import("@/lib/weekly-behavior.server");
      return { access, data: await computeWeeklyBehavior() };
    } catch {
      return { access, data: null };
    }
  });
