import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const passcodeSchema = z.object({ passcode: z.string().min(1) });

export const listApplications = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => passcodeSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyPasscode, listApplicationsImpl } = await import("@/lib/admin-actions.server");
    verifyPasscode(data.passcode);
    return listApplicationsImpl();
  });

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
export type ApplicationList = UnwrapPromise<ReturnType<typeof listApplications>>;

const sendSchema = z.object({
  passcode: z.string().min(1),
  applicationId: z.string().uuid(),
  origin: z.string().url(),
  promoCode: z.string().trim().max(32).optional(),
});

export const sendPaymentLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyPasscode, sendPaymentLinkImpl } = await import("@/lib/admin-actions.server");
    verifyPasscode(data.passcode);
    return sendPaymentLinkImpl(data.applicationId, data.promoCode);
  });

const idSchema = z.object({
  passcode: z.string().min(1),
  applicationId: z.string().uuid(),
});

export const denyApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyPasscode, denyApplicationImpl } = await import("@/lib/admin-actions.server");
    verifyPasscode(data.passcode);
    return denyApplicationImpl(data.applicationId);
  });

export const removeApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyPasscode, removeApplicationImpl } = await import("@/lib/admin-actions.server");
    verifyPasscode(data.passcode);
    return removeApplicationImpl(data.applicationId);
  });
