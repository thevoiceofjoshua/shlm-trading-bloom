import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const TIERS = {
  foundation: { name: "SHLM Foundation", amount: 49900 },
  mentorship: { name: "SHLM Mentorship", amount: 149900 },
  elite: { name: "SHLM Elite", amount: 299900 },
} as const;

export type TierKey = keyof typeof TIERS;

const inputSchema = z.object({
  tier: z.enum(["foundation", "mentorship", "elite"]),
  email: z.string().email().optional(),
  origin: z.string().url(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const secret = process.env.STRIPE_LIVE_API_KEY;
    if (!secret) throw new Error("Stripe not configured");
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secret);

    const tier = TIERS[data.tier];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: tier.name },
            unit_amount: tier.amount,
          },
          quantity: 1,
        },
      ],
      customer_email: data.email,
      metadata: { tier: data.tier },
      success_url: `${data.origin}/success?tier=${data.tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/#pricing`,
    });

    return { url: session.url };
  });

const verifySchema = z.object({ session_id: z.string().min(1) });

export const verifyCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => verifySchema.parse(data))
  .handler(async ({ data }) => {
    const secret = process.env.STRIPE_LIVE_API_KEY;
    if (!secret) throw new Error("Stripe not configured");
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.retrieve(data.session_id);
    const paid = session.payment_status === "paid";
    const tier = (session.metadata?.tier as TierKey | undefined) ?? "foundation";
    const email = session.customer_details?.email ?? session.customer_email ?? "";

    if (paid) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("purchases")
        .upsert(
          {
            email,
            tier,
            stripe_session_id: session.id,
            stripe_payment_intent:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
            amount_total: session.amount_total,
            currency: session.currency,
            status: "paid",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_session_id" },
        );
    }

    return { paid, tier, email };
  });
