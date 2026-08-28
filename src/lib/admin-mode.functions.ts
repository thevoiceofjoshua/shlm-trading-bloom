import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Verifies the signed-in user is an admin AND that the passcode matches.
 * Returns only a boolean — never echoes the expected passcode.
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
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error("Could not verify admin role");
    if (!isAdmin) return { ok: false as const, reason: "not-admin" as const };

    const expected = process.env["ADMIN_PASSCODE"];
    if (!expected) throw new Error("Admin passcode is not configured");
    if (data.passcode !== expected) {
      return { ok: false as const, reason: "bad-passcode" as const };
    }
    return { ok: true as const };
  });
