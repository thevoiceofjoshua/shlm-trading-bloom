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

// ---------------------------------------------------------------------------
// Account role management (Founder only — verifyPasscode rejects SHLM MOD).
// ---------------------------------------------------------------------------

export type ManagedRole = "admin" | "shlm_mod" | "free_member" | "member" | "revoked";

export type AdminAccountRow = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  role: ManagedRole;
};

export async function listAccountsImpl(): Promise<AdminAccountRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const users: {
    id: string;
    email?: string | null;
    created_at: string;
    banned_until?: string | null;
    user_metadata?: Record<string, unknown> | null;
  }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const batch = data?.users ?? [];
    users.push(...(batch as typeof users));
    if (batch.length < 200) break;
  }

  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role");
  if (roleError) throw new Error(roleError.message);

  const roleByUser = new Map<string, ManagedRole>();
  for (const r of (roleRows ?? []) as { user_id: string; role: string }[]) {
    const role = r.role as ManagedRole;
    const current = roleByUser.get(r.user_id);
    // Highest privilege wins if somehow multiple rows exist.
    const rank: Record<string, number> = { admin: 3, shlm_mod: 2, free_member: 1 };
    if (!current || (rank[role] ?? 0) > (rank[current] ?? 0)) {
      if (role === "admin" || role === "shlm_mod" || role === "free_member") roleByUser.set(r.user_id, role);
    }
  }

  return users
    .map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        (typeof meta["full_name"] === "string" && (meta["full_name"] as string)) ||
        (typeof meta["name"] === "string" && (meta["name"] as string)) ||
        null;
      const banned = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
      return {
        id: u.id,
        email: u.email ?? null,
        name,
        created_at: u.created_at,
        role: banned ? ("revoked" as ManagedRole) : roleByUser.get(u.id) ?? ("member" as ManagedRole),
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function setUserRoleImpl(userId: string, role: ManagedRole) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Never allow the last Founder to be demoted — that would lock the console.
  if (role !== "admin") {
    const { data: admins, error: adminError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (adminError) throw new Error(adminError.message);
    const adminIds = ((admins ?? []) as { user_id: string }[]).map((r) => r.user_id);
    if (adminIds.includes(userId) && adminIds.length <= 1) {
      throw new Error("At least one Founder account must remain.");
    }
  }

  const { error: deleteError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);

  if (role !== "member") {
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (insertError) throw new Error(insertError.message);
  }

  return { updated: true, role };
}
