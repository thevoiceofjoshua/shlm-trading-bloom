import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkoutPreflight, runCheckoutAction } from "@/lib/checkout-api";

const schema = z.object({
  origin: z.string().url(),
  months: z.number().int().min(1).max(12).default(1),
  email: z.string().email().optional(),
});

export const Route = createFileRoute("/api/public/checkout/extension")({
  server: {
    handlers: {
      OPTIONS: checkoutPreflight,
      POST: async ({ request }) =>
        runCheckoutAction(
          request,
          (raw) => schema.parse(raw),
          async (input) => {
            const { createExtensionCheckoutSessionImpl } = await import("@/lib/checkout.server");
            return createExtensionCheckoutSessionImpl(input);
          },
        ),
    },
  },
});
