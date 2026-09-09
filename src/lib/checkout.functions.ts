import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  email: z.string().email().optional(),
  origin: z.string().url(),
  promoCode: z.string().trim().max(32).optional(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { createCheckoutSessionImpl } = await import("@/lib/checkout.server");
    return createCheckoutSessionImpl(data);
  });

/** $150/month extension after the initial 8-week term. */
export const createExtensionCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        origin: z.string().url(),
        months: z.number().int().min(1).max(12).default(1),
        email: z.string().email().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { createExtensionCheckoutSessionImpl } = await import("@/lib/checkout.server");
    return createExtensionCheckoutSessionImpl(data);
  });

/** $0.50 throwaway product used only to exercise the live checkout + webhook flow. */
export const createTestCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ origin: z.string().url() }).parse(data))
  .handler(async ({ data }) => {
    const { createTestCheckoutSessionImpl } = await import("@/lib/checkout.server");
    return createTestCheckoutSessionImpl(data);
  });

export const verifyCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ session_id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { verifyCheckoutSessionImpl } = await import("@/lib/checkout.server");
    return verifyCheckoutSessionImpl(data);
  });
