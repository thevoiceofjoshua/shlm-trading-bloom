import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: dateSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row } = await context.supabase
      .from("member_readiness")
      .select("checks")
      .eq("user_id", context.userId)
      .eq("ready_date", data.date)
      .maybeSingle();
    return { checks: ((row?.checks ?? {}) as Record<string, boolean>) };
  });

export const saveReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ date: dateSchema, checks: z.record(z.string().max(40), z.boolean()) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("member_readiness")
      .upsert({ user_id: context.userId, ready_date: data.date, checks: data.checks }, { onConflict: "user_id,ready_date" });
    if (error) throw new Error("Could not save checklist");
    return { ok: true };
  });
