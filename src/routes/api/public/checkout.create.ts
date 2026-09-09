import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkoutPreflight, runCheckoutAction } from "@/lib/checkout-api";

const schema = z.object({
  email: z.string().email().optional(),
  origin: z.string().url(),
  promoCode: z.string().trim().max(32).optional(),
});

export const Route = createFileRoute("/api/public/checkout/create")({
  server: {
    handlers: {
      OPTIONS: checkoutPreflight,
      POST: async ({ request }) =>
        runCheckoutAction(
          request,
          (raw) => schema.parse(raw),
          async (input) => {
            const { createCheckoutSessionImpl } = await import("@/lib/checkout.server");
            return createCheckoutSessionImpl(input);
          },
        ),
    },
  },
});
