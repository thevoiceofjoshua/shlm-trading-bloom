import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TIERS, higherTiers, isTierKey, quoteUpgrade, type TierKey } from "@/lib/tiers";

export const getMyMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims.email as string | undefined) ?? null;
    let query = context.supabase
      .from("purchases")
      .select("id, tier, status, amount_total, currency, created_at, stripe_session_id")
      .eq("status", "paid")
      .order("created_at", { ascending: false });
    if (email) query = query.or(`user_id.eq.${context.userId},email.eq.${email}`);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []).filter((r) => isTierKey(r.tier));
    if (rows.length === 0) return { purchases: [], current: null, upgrades: [] };

    const current = rows.reduce((best, row) =>
      TIERS[row.tier as TierKey].amount > TIERS[best.tier as TierKey].amount ? row : best,
    );
    const tier = current.tier as TierKey;

    return {
      purchases: rows.map((r) => ({
        id: r.id,
        tier: r.tier as TierKey,
        amount_total: r.amount_total,
        currency: r.currency,
        created_at: r.created_at,
      })),
      current: { id: current.id, tier, created_at: current.created_at },
      upgrades: higherTiers(tier).map((to) => quoteUpgrade(tier, to, current.created_at)),
    };
  });

export const createUpgradeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        to: z.enum(["foundation", "mentorship", "elite"]),
        origin: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims.email as string | undefined) ?? undefined;
    let query = context.supabase
      .from("purchases")
      .select("id, tier, created_at")
      .eq("status", "paid")
      .order("created_at", { ascending: false });
    if (email) query = query.or(`user_id.eq.${context.userId},email.eq.${email}`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const owned = (rows ?? []).filter((r) => isTierKey(r.tier));
    if (owned.length === 0) throw new Error("No active membership found");

    const current = owned.reduce((best, row) =>
      TIERS[row.tier as TierKey].amount > TIERS[best.tier as TierKey].amount ? row : best,
    );
    const from = current.tier as TierKey;
    if (!higherTiers(from).includes(data.to)) throw new Error("Not an upgrade");

    const quote = quoteUpgrade(from, data.to, current.created_at);

    const secret = process.env.STRIPE_LIVE_API_KEY;
    if (!secret) throw new Error("Stripe not configured");
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Upgrade to ${TIERS[data.to].name}`,
              description: `Prorated upgrade from ${TIERS[from].name} — ${quote.monthsUsed} of 12 months used, credit applied for ${quote.monthsRemaining} remaining.`,
            },
            unit_amount: quote.amountDue,
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        tier: data.to,
        upgrade_from: from,
        upgrade_credit: String(quote.credit),
        months_used: String(quote.monthsUsed),
        user_id: context.userId,
      },
      success_url: `${data.origin}/success?tier=${data.to}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/dashboard`,
    });

    return { url: session.url, quote };
  });
