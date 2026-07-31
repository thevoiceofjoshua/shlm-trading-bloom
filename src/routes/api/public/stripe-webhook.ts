import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_LIVE_API_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return new Response("Stripe not configured", { status: 500 });

        const rawBody = await request.text();
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(secret);

        let event: import("stripe").Stripe.Event;
        if (webhookSecret) {
          const sig = request.headers.get("stripe-signature");
          if (!sig) return new Response("Missing signature", { status: 400 });
          try {
            event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
          } catch (err) {
            return new Response(`Invalid signature: ${(err as Error).message}`, { status: 400 });
          }
        } else {
          // Webhook secret not yet set — accept but log. Add STRIPE_WEBHOOK_SECRET to enforce.
          try {
            event = JSON.parse(rawBody) as import("stripe").Stripe.Event;
          } catch {
            return new Response("Invalid payload", { status: 400 });
          }
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as import("stripe").Stripe.Checkout.Session;
          const tier = (session.metadata?.tier as string | undefined) ?? "foundation";
          const email = session.customer_details?.email ?? session.customer_email ?? "";
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("purchases").upsert(
            {
              email,
              tier,
              user_id: (session.metadata?.user_id as string | undefined) || null,
              stripe_session_id: session.id,

              stripe_payment_intent:
                typeof session.payment_intent === "string" ? session.payment_intent : null,
              amount_total: session.amount_total,
              currency: session.currency,
              status: session.payment_status === "paid" ? "paid" : "pending",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_session_id" },
          );

          // Send the client their receipt once the payment is fully processed.
          if (session.payment_status === "paid" && email) {
            try {
              const { TIERS } = await import("@/lib/tiers");
              const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

              const tierName = (TIERS as Record<string, { name: string }>)[tier]?.name
                ? `SHLM ${(TIERS as Record<string, { name: string }>)[tier].name}`
                : "SHLM Mentorship";

              const amount = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: (session.currency ?? "usd").toUpperCase(),
              }).format((session.amount_total ?? 0) / 100);

              let paymentMethod = "Card";
              let invoiceNumber = `SHLM-${session.id.slice(-8).toUpperCase()}`;
              try {
                if (typeof session.payment_intent === "string") {
                  const pi = await stripe.paymentIntents.retrieve(session.payment_intent, {
                    expand: ["latest_charge"],
                  });
                  const charge = pi.latest_charge as import("stripe").Stripe.Charge | null;
                  const card = charge?.payment_method_details?.card;
                  if (card) {
                    paymentMethod = `${(card.brand ?? "Card").replace(/^\w/, (c) => c.toUpperCase())} ending ${card.last4}`;
                  }
                  if (charge?.receipt_number) invoiceNumber = charge.receipt_number;
                }
              } catch {
                // Non-fatal: fall back to defaults above.
              }

              await sendTemplateEmail("payment-receipt", email, {
                idempotencyKey: `payment-receipt-${session.id}`,
                templateData: {
                  fullName: session.customer_details?.name ?? "there",
                  tier: tierName,
                  amount,
                  invoiceNumber,
                  paymentDate: new Date().toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "America/Los_Angeles",
                  }),
                  paymentMethod,
                  billedTo: email,
                  dashboardUrl: "https://shlmtrdng.com/dashboard",
                },
              });
            } catch (err) {
              console.error("Receipt email failed", err);
            }
          }
        }


        return new Response("ok", { status: 200 });
      },
    },
  },
});
