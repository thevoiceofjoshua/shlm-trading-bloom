import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { EXTENSION, PROGRAM, extensionTotal, purchaseName } from "@/lib/tiers";

const PROMO_CODES: Record<string, number> = {
  "1MILL": 0.2,
};

const inputSchema = z.object({
  email: z.string().email().optional(),
  origin: z.string().url(),
  promoCode: z.string().trim().max(32).optional(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const secret = process.env.STRIPE_LIVE_API_KEY;
    if (!secret) throw new Error("Stripe not configured");
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secret);

    const normalizedCode = data.promoCode?.toUpperCase();
    const discount = normalizedCode ? PROMO_CODES[normalizedCode] ?? 0 : 0;
    const finalAmount = Math.round(PROGRAM.amount * (1 - discount));
    const productName =
      discount > 0
        ? `${PROGRAM.name} — ${PROGRAM.weeks} weeks (${normalizedCode} • ${Math.round(discount * 100)}% off)`
        : `${PROGRAM.name} — ${PROGRAM.weeks} weeks`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: productName },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
      customer_email: data.email,
      metadata: {
        tier: PROGRAM.key,
        promo_code: discount > 0 ? normalizedCode! : "",
        original_amount: String(PROGRAM.amount),
      },
      success_url: `${data.origin}/success?kind=${PROGRAM.key}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/#pricing`,
    });

    return { url: session.url };
  });

/** $150/month extension after the initial 8-week term. */
export const createExtensionCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        origin: z.string().url(),
        months: z.number().int().min(1).max(12).default(1),
        email: z.string().email().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
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
              name: EXTENSION.name,
              description: `Extend your SHLM mentorship access by ${data.months} month${data.months === 1 ? "" : "s"}.`,
            },
            unit_amount: EXTENSION.amount,
          },
          quantity: data.months,
        },
      ],
      customer_email: data.email,
      metadata: {
        tier: EXTENSION.key,
        extension_months: String(data.months),
      },
      success_url: `${data.origin}/success?kind=${EXTENSION.key}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/dashboard`,
    });

    return { url: session.url, amount: extensionTotal(data.months) };
  });

/** $0.50 throwaway product used only to exercise the live checkout + webhook flow. */
export const createTestCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ origin: z.string().url() }).parse(data))
  .handler(async ({ data }) => {
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
            product_data: { name: "SHLM Test Product (checkout verification)" },
            unit_amount: 50,
          },
          quantity: 1,
        },
      ],
      metadata: { tier: PROGRAM.key, test_product: "true" },
      success_url: `${data.origin}/success?kind=${PROGRAM.key}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/test-checkout`,
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
    const tier = (session.metadata?.tier as string | undefined) ?? PROGRAM.key;
    const email = session.customer_details?.email ?? session.customer_email ?? "";
    const months = Number(session.metadata?.extension_months ?? 0) || 0;

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

    return { paid, tier, kind: tier, name: purchaseName(tier), months, email };
  });
