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
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
