import { PROGRAM } from "@/lib/tiers";

const PROMO_CODES: Record<string, number> = { "1MILL": 0.2 };

/**
 * Creates a fresh Stripe Checkout session for an application.
 * Used both when the approval email is sent and every time the
 * applicant clicks the enrollment link (so it never expires).
 *
 * Single price: one-time $500 for the 8-week program.
 * The `tier` on an application is the applicant's entry level, not a price.
 */
export async function createApplicationCheckout(opts: {
  applicationId: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  tier?: string;
  origin: string;
  promoCode?: string;
}) {
  const secret = process.env.STRIPE_LIVE_API_KEY;
  if (!secret) throw new Error("Stripe not configured");
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secret);

  const normalizedCode = opts.promoCode?.toUpperCase();
  const discount = normalizedCode ? PROMO_CODES[normalizedCode] ?? 0 : 0;
  const finalAmount = Math.round(PROGRAM.amount * (1 - discount));
  const baseName = `${PROGRAM.name} — ${PROGRAM.weeks} weeks`;
  const productName =
    discount > 0
      ? `${baseName} (${normalizedCode} • ${Math.round(discount * 100)}% off)`
      : baseName;

  // Pre-fill the applicant's details at checkout by reusing/creating a Stripe
  // customer built from what they entered on the SHLM application.
  let customerId: string | undefined;
  try {
    const existing = await stripe.customers.list({ email: opts.email, limit: 1 });
    const details = {
      email: opts.email,
      ...(opts.fullName ? { name: opts.fullName } : {}),
      ...(opts.phone ? { phone: opts.phone } : {}),
      metadata: { application_id: opts.applicationId },
    };
    const customer = existing.data[0]
      ? await stripe.customers.update(existing.data[0].id, details)
      : await stripe.customers.create(details);
    customerId = customer.id;
  } catch {
    customerId = undefined;
  }

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
    ...(customerId ? { customer: customerId } : { customer_email: opts.email }),
    customer_update: customerId ? { name: "auto", address: "auto" } : undefined,
    phone_number_collection: { enabled: true },
    metadata: {
      tier: PROGRAM.key,
      entry_level: opts.tier ?? "",
      promo_code: discount > 0 ? normalizedCode! : "",
      original_amount: String(PROGRAM.amount),
      application_id: opts.applicationId,
    },
    success_url: `${opts.origin}/success?kind=${PROGRAM.key}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/#pricing`,
  });

  if (!session.url) throw new Error("Failed to create checkout session");

  return {
    session,
    tierInfo: { name: baseName, amount: PROGRAM.amount },
    finalAmount,
    normalizedCode,
    discount,
  };
}
