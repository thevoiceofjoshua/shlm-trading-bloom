const TIERS = {
  foundation: { name: "SHLM Foundation", amount: 49900 },
  mentorship: { name: "SHLM Mentorship", amount: 149900 },
  elite: { name: "SHLM Elite", amount: 299900 },
} as const;

export type EnrollTier = keyof typeof TIERS;

const PROMO_CODES: Record<string, number> = { "1MILL": 0.2 };

export function resolveTier(tier: string): EnrollTier {
  if (tier in TIERS) return tier as EnrollTier;
  throw new Error("Invalid tier");
}

/**
 * Creates a fresh Stripe Checkout session for an application.
 * Used both when the approval email is sent and every time the
 * applicant clicks the enrollment link (so it never expires).
 */
export async function createApplicationCheckout(opts: {
  applicationId: string;
  email: string;
  tier: string;
  origin: string;
  promoCode?: string;
}) {
  const secret = process.env.STRIPE_LIVE_API_KEY;
  if (!secret) throw new Error("Stripe not configured");
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secret);

  const tier = resolveTier(opts.tier);
  const tierInfo = TIERS[tier];
  const normalizedCode = opts.promoCode?.toUpperCase();
  const discount = normalizedCode ? PROMO_CODES[normalizedCode] ?? 0 : 0;
  const finalAmount = Math.round(tierInfo.amount * (1 - discount));
  const productName =
    discount > 0
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
    customer_email: opts.email,
    metadata: {
      tier,
      promo_code: discount > 0 ? normalizedCode! : "",
      original_amount: String(tierInfo.amount),
      application_id: opts.applicationId,
    },
    success_url: `${opts.origin}/success?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/#pricing`,
  });

  if (!session.url) throw new Error("Failed to create checkout session");

  return { session, tierInfo, finalAmount, normalizedCode, discount };
}

export { TIERS as ENROLL_TIERS };
