import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminPreflight, runAdminAction } from "@/lib/admin-api";

const schema = z.object({
  passcode: z.string().min(1),
  applicationId: z.string().uuid(),
  origin: z.string().url().optional(),
  promoCode: z.string().trim().max(32).optional(),
});

export const Route = createFileRoute("/api/public/admin/send-payment-link")({
  server: {
    handlers: {
      OPTIONS: adminPreflight,
      POST: async ({ request }) =>
        runAdminAction(
          request,
          (raw) => schema.parse(raw),
          async (input) => {
            const { sendPaymentLinkImpl } = await import("@/lib/admin-actions.server");
            return sendPaymentLinkImpl(input.applicationId, input.promoCode);
          },
        ),
    },
  },
});
