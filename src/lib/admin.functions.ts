import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const passcodeSchema = z.object({ passcode: z.string().min(1) });

function verifyPasscode(passcode: string) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected || passcode !== expected) {
    throw new Error("Invalid passcode");
  }
}

const listSchema = passcodeSchema;

export const listApplications = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => listSchema.parse(data))
  .handler(async ({ data }) => {
    verifyPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("applications")
      .select(
        "id, full_name, email, tier, phone, experience, goals, scheduled_at, timezone, status, payment_link_sent_at, payment_link_status, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
export type ApplicationList = UnwrapPromise<ReturnType<typeof listApplications>>;

const sendSchema = z.object({
  passcode: z.string().min(1),
  applicationId: z.string().uuid(),
  origin: z.string().url(),
  promoCode: z.string().trim().max(32).optional(),
});

export const sendPaymentLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data }) => {
    verifyPasscode(data.passcode);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: app, error: fetchError } = await supabaseAdmin
      .from("applications")
      .select("id, full_name, email, tier")
      .eq("id", data.applicationId)
      .single();

    if (fetchError || !app) throw new Error(fetchError?.message || "Application not found");

    const tier = app.tier as "foundation" | "mentorship" | "elite";
    if (!["foundation", "mentorship", "elite"].includes(tier)) {
      throw new Error("Invalid tier");
    }

    const secret = process.env.STRIPE_LIVE_API_KEY;
    if (!secret) throw new Error("Stripe not configured");
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secret);

    const TIERS = {
      foundation: { name: "SHLM Foundation", amount: 49900 },
      mentorship: { name: "SHLM Mentorship", amount: 149900 },
      elite: { name: "SHLM Elite", amount: 299900 },
    } as const;

    const PROMO_CODES: Record<string, number> = { "1MILL": 0.2 };

    const tierInfo = TIERS[tier];
    const normalizedCode = data.promoCode?.toUpperCase();
    const discount = normalizedCode ? PROMO_CODES[normalizedCode] ?? 0 : 0;
    const finalAmount = Math.round(tierInfo.amount * (1 - discount));
    const productName = discount > 0
      ? `${tierInfo.name} (${normalizedCode} • ${Math.round(discount * 100)}% off)`
      : tierInfo.name;

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
      customer_email: app.email,
      metadata: {
        tier,
        promo_code: discount > 0 ? normalizedCode! : "",
        original_amount: String(tierInfo.amount),
        application_id: app.id,
      },
      success_url: `${data.origin}/success?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/#pricing`,
    });

    if (!session.url) throw new Error("Failed to create checkout session");

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const displayAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(finalAmount / 100);

    await sendTemplateEmail("payment-link", app.email, {
      idempotencyKey: `payment-link-${app.id}`,
      templateData: {
        fullName: app.full_name,
        tier: tierInfo.name,
        checkoutUrl: session.url,
        amount: displayAmount,
        promoCode: normalizedCode,
        discountPercent: discount > 0 ? `${Math.round(discount * 100)}` : undefined,
      },
    });

    const { error: updateError } = await supabaseAdmin
      .from("applications")
      .update({
        payment_link_sent_at: new Date().toISOString(),
        payment_link_session_id: session.id,
        payment_link_status: "sent",
      })
      .eq("id", app.id);

    if (updateError) throw new Error(updateError.message);

    return { sent: true, sessionId: session.id };
  });
