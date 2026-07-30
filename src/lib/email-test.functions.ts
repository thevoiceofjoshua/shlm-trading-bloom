import { createServerFn } from "@tanstack/react-start";

export const sendTestEmails = createServerFn({ method: "POST" }).handler(async () => {
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const to = "joschewagner56@gmail.com";
  const stamp = Date.now();

  const approval = await sendTemplateEmail("payment-link", to, {
    idempotencyKey: `test-payment-link-${stamp}`,
    templateData: {
      fullName: "Josh Wagner",
      tier: "SHLM Mentorship",
      checkoutUrl: "https://shlmtrdng.com/#pricing",
      amount: "$1,499.00",
    },
  });

  const denial = await sendTemplateEmail("application-denial", to, {
    idempotencyKey: `test-denial-${stamp}`,
    templateData: { fullName: "Josh Wagner" },
  });

  return { approval, denial };
});
