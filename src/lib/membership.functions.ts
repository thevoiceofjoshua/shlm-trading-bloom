import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXTENSION, PROGRAM, accessWindow, purchaseName } from "@/lib/tiers";

export const getMyMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims.email as string | undefined) ?? null;

    // Complimentary lifetime members: granted by role, no Stripe purchase.
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const lifetime = ((roleRows ?? []) as { role: string }[]).some((r) => r.role === "free_member");

    let query = context.supabase
      .from("purchases")
      .select("id, tier, status, amount_total, currency, created_at, stripe_session_id")
      .eq("status", "paid")
      .order("created_at", { ascending: true });
    if (email) query = query.or(`user_id.eq.${context.userId},email.eq.${email}`);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    if (rows.length === 0) {
      if (!lifetime) return { purchases: [], enrollment: null, access: null, lifetime: false };
      const grantedAt = new Date().toISOString();
      return {
        purchases: [],
        lifetime: true,
        enrollment: {
          id: "lifetime-access",
          name: PROGRAM.name,
          amount_total: PROGRAM.amount,
          created_at: grantedAt,
        },
        access: { ...accessWindow(grantedAt, 0), active: true, daysRemaining: Infinity },
      };
    }

    // Anything that isn't an extension counts as the enrollment purchase
    // (covers legacy tier rows from the old three-tier model).
    const enrollment = rows.find((r) => r.tier !== EXTENSION.key) ?? rows[0];

    const extensionMonths = rows
      .filter((r) => r.tier === EXTENSION.key)
      .reduce(
        (sum, r) => sum + Math.max(1, Math.round((r.amount_total ?? EXTENSION.amount) / EXTENSION.amount)),
        0,
      );

    return {
      purchases: rows.map((r) => ({
        id: r.id,
        tier: r.tier,
        name: purchaseName(r.tier),
        amount_total: r.amount_total,
        currency: r.currency,
        created_at: r.created_at,
      })),
      enrollment: {
        id: enrollment.id,
        name: purchaseName(enrollment.tier),
        amount_total: enrollment.amount_total ?? PROGRAM.amount,
        created_at: enrollment.created_at,
      },
      lifetime,
      access: lifetime
        ? { ...accessWindow(enrollment.created_at, extensionMonths), active: true, daysRemaining: Infinity }
        : accessWindow(enrollment.created_at, extensionMonths),
    };
  });
