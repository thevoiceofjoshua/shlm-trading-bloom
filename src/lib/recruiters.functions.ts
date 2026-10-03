import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const LAND_RATE = 100;
export const BONUS_PER = 20;
export const BONUS_AMOUNT = 550;

export type RecruiterRow = {
  id: string;
  name: string;
  lifetime: number;
  thisMonth: number;
};

/** First day of the current calendar month in Pacific time, as YYYY-MM-01. */
function currentMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}-01`;
}

async function roleOf(context: any): Promise<"admin" | "recruiter" | null> {
  // userId comes from the token verified by requireSupabaseAuth; look up its
  // roles with the server client so a quiet RLS/read hiccup can't hide them.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(`Role lookup failed: ${error.message}`);
  const held = ((data ?? []) as { role: string }[]).map((r) => r.role);
  if (held.includes("admin")) return "admin";
  if (held.includes("recruiter")) return "recruiter";
  return null;
}

class NotAuthorized extends Error {
  constructor() {
    super("NOT_AUTHORIZED");
  }
}

export const getRecruiterAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ role: await roleOf(context) }));

export const getRecruiterPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await roleOf(context);
    if (!role) throw new Error("Not authorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let ids: string[];
    if (role === "admin") {
      const { data, error } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "recruiter" as any);
      if (error) throw new Error(error.message);
      ids = [...new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id))];
    } else {
      ids = [context.userId];
    }
    if (ids.length === 0) return { isFounder: role === "admin", rows: [] as RecruiterRow[] };

    const { data: lands, error: landsError } = await supabaseAdmin
      .from("recruiter_lands" as any)
      .select("recruiter_id, delta, month")
      .in("recruiter_id", ids);
    if (landsError) throw new Error(landsError.message);
    const month = currentMonth();

    const rows: RecruiterRow[] = [];
    for (const id of ids) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        (typeof meta["full_name"] === "string" && (meta["full_name"] as string)) ||
        (typeof meta["name"] === "string" && (meta["name"] as string)) ||
        u?.user?.email ||
        "Recruiter";
      const mine = ((lands ?? []) as unknown as { recruiter_id: string; delta: number; month: string }[]).filter(
        (l) => l.recruiter_id === id,
      );
      rows.push({
        id,
        name,
        lifetime: mine.reduce((s, l) => s + l.delta, 0),
        thisMonth: mine.filter((l) => l.month === month).reduce((s, l) => s + l.delta, 0),
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return { isFounder: role === "admin", rows };
  });

export const adjustRecruiterLands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ recruiterId: z.string().uuid(), delta: z.number().int().min(-1000).max(1000).refine((n) => n !== 0) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isRecruiter } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.recruiterId)
      .eq("role", "recruiter" as any)
      .maybeSingle();
    if (!isRecruiter) throw new Error("That account is not a recruiter.");

    const month = currentMonth();
    if (data.delta < 0) {
      const { data: rows } = await supabaseAdmin
        .from("recruiter_lands" as any)
        .select("delta, month")
        .eq("recruiter_id", data.recruiterId);
      const list = (rows ?? []) as unknown as { delta: number; month: string }[];
      const life = list.reduce((s, l) => s + l.delta, 0);
      const mon = list.filter((l) => l.month === month).reduce((s, l) => s + l.delta, 0);
      if (life + data.delta < 0 || mon + data.delta < 0) throw new Error("Totals can't go below 0.");
    }

    const { error } = await supabaseAdmin.from("recruiter_lands" as any).insert({
      recruiter_id: data.recruiterId,
      delta: data.delta,
      month,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
