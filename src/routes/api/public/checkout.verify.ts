import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkoutPreflight, runCheckoutAction } from "@/lib/checkout-api";

const schema = z.object({ session_id: z.string().min(1) });

export const Route = createFileRoute("/api/public/checkout/verify")({
  server: {
    handlers: {
      OPTIONS: checkoutPreflight,
      POST: async ({ request }) =>
        runCheckoutAction(
          request,
          (raw) => schema.parse(raw),
          async (input) => {
            const { verifyCheckoutSessionImpl } = await import("@/lib/checkout.server");
            return verifyCheckoutSessionImpl(input);
          },
        ),
    },
  },
});
