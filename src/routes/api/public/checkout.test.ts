import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkoutPreflight, runCheckoutAction } from "@/lib/checkout-api";

const schema = z.object({ origin: z.string().url() });

export const Route = createFileRoute("/api/public/checkout/test")({
  server: {
    handlers: {
      OPTIONS: checkoutPreflight,
      POST: async ({ request }) =>
        runCheckoutAction(
          request,
          (raw) => schema.parse(raw),
          async (input) => {
            const { createTestCheckoutSessionImpl } = await import("@/lib/checkout.server");
            return createTestCheckoutSessionImpl(input);
          },
        ),
    },
  },
});
