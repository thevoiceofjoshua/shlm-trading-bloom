import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminScope = "full" | "shlm_mod";

/**
 * Verifies the signed-in user holds a staff role AND that the matching passcode
 * is correct. `admin` uses ADMIN_PASSCODE (full store access); `shlm_mod` uses
 * SHLM_MOD_PASSCODE and only unlocks the SHLM Centre — never program changes.
 * Returns only booleans/scope — never echoes the expected passcode.
 */
export const verifyAdminPasscode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { passcode: string }) => {
    if (!data || typeof data.passcode !== "string" || data.passcode.length < 1) {
      throw new Error("Passcode required");
    }
    return { passcode: data.passcode };
  })
  .handler(async ({ data, context }) => {
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not verify admin role");

    const held = (roles ?? []).map((r: { role: string }) => r.role);
    const scope: AdminScope | null = held.includes("admin")
      ? "full"
      : held.includes("shlm_mod")
        ? "shlm_mod"
        : null;
    if (!scope) return { ok: false as const, reason: "not-admin" as const };

    const expected =
      scope === "full" ? process.env["ADMIN_PASSCODE"] : process.env["SHLM_MOD_PASSCODE"];
    if (!expected) throw new Error("Admin passcode is not configured");
    if (data.passcode !== expected) {
      return { ok: false as const, reason: "bad-passcode" as const };
    }
    return { ok: true as const, scope };
  });
