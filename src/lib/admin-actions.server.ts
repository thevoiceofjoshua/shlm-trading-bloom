// Server-only implementation of the SHLM Founder admin actions.
// Shared by the in-app server functions and the public /api/public/admin/* routes
// (used when the storefront is hosted outside Lovable and has no service-role key).

export function verifyPasscode(passcode: string) {
  const expected = process.env["ADMIN_PASSCODE"];
  const modPasscode = process.env["SHLM_MOD_PASSCODE"];
  // SHLM MOD is Centre-only: its passcode can never reach program mutations.
  if (modPasscode && passcode === modPasscode) {
    throw new Error("Invalid passcode");
  }
  if (!expected || passcode !== expected) {
    throw new Error("Invalid passcode");
  }
}

export async function listApplicationsImpl() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("applications")
    .select(
      "id, full_name, email, tier, phone, experience, goals, scheduled_at, timezone, status, payment_link_sent_at, payment_link_status, created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function sendPaymentLinkImpl(applicationId: string, promoCode?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: app, error: fetchError } = await supabaseAdmin
    .from("applications")
    .select("id, full_name, email, phone, tier")
    .eq("id", applicationId)
    .single();

  if (fetchError || !app) throw new Error(fetchError?.message || "Application not found");

  const entryLevel = (app.tier as string | null) ?? "";
  const SITE_URL = "https://shlmtrdng.com";

  const { createApplicationCheckout } = await import("@/lib/enroll.server");
  const { session, tierInfo, finalAmount, normalizedCode, discount } = await createApplicationCheckout({
    applicationId: app.id,
    email: app.email,
    fullName: app.full_name,
    phone: app.phone,
    tier: entryLevel,
    origin: SITE_URL,
    promoCode,
  });

  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const displayAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(finalAmount / 100);

  await sendTemplateEmail("payment-link", app.email, {
    idempotencyKey: `payment-link-${app.id}`,
    templateData: {
      fullName: app.full_name,
      tier: tierInfo.name,
      checkoutUrl: `${SITE_URL}/enroll/${app.id}`,
      amount: displayAmount,
      promoCode: normalizedCode,
      discountPercent: discount > 0 ? `${Math.round(discount * 100)}` : undefined,
    },
  });

  const { error: updateError } = await supabaseAdmin
    .from("applications")
    .update({
      payment_link_sent_at: new Date().toISOString(),
      payment_link_session_id: session.id,
      payment_link_status: "sent",
      status: "approved",
    })
    .eq("id", app.id);

  if (updateError) throw new Error(updateError.message);

  return { sent: true, sessionId: session.id };
}

export async function denyApplicationImpl(applicationId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: app, error: fetchError } = await supabaseAdmin
    .from("applications")
    .select("id, full_name, email")
    .eq("id", applicationId)
    .single();

  if (fetchError || !app) throw new Error(fetchError?.message || "Application not found");

  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  await sendTemplateEmail("application-denial", app.email, {
    idempotencyKey: `denial-${app.id}`,
    templateData: { fullName: app.full_name },
  });

  const { error: updateError } = await supabaseAdmin
    .from("applications")
    .update({ status: "denied" })
    .eq("id", app.id);

  if (updateError) throw new Error(updateError.message);

  return { denied: true };
}

export async function removeApplicationImpl(applicationId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("applications").delete().eq("id", applicationId);
  if (error) throw new Error(error.message);
  return { removed: true };
}
