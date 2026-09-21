import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Derives the WebAuthn relying party from the incoming request origin. */
function relyingParty(): { rpID: string; origin: string } {
  const url = new URL(getRequest().url);
  return { rpID: url.hostname, origin: url.origin };
}

export interface PasskeyRow {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const listPasskeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PasskeyRow[]> => {
    const { data } = await context.supabase
      .from("user_passkeys")
      .select("id, device_label, created_at, last_used_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id,
      deviceLabel: r.device_label,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
    }));
  });

export const removePasskey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_passkeys")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startPasskeyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { generateRegistrationOptions } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID } = relyingParty();

    const { data: existing } = await supabaseAdmin
      .from("user_passkeys")
      .select("credential_id, transports")
      .eq("user_id", context.userId);

    const email = (context.claims as { email?: string } | null)?.email ?? "member";

    const options = await generateRegistrationOptions({
      rpName: "SHLM",
      rpID,
      userID: new TextEncoder().encode(context.userId),
      userName: email,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      excludeCredentials: (existing ?? []).map((c) => ({ id: c.credential_id })),
    });

    await supabaseAdmin.from("webauthn_challenges").insert({
      challenge: options.challenge,
      user_id: context.userId,
      kind: "register",
    });

    return options;
  });

export const finishPasskeyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ response: z.any(), deviceLabel: z.string().trim().max(60).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { verifyRegistrationResponse } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID, origin } = relyingParty();

    const challenge = data.response?.response?.clientDataJSON
      ? JSON.parse(atob((data.response.response.clientDataJSON as string).replace(/-/g, "+").replace(/_/g, "/")))
          .challenge
      : null;
    if (!challenge) throw new Error("Malformed device response.");

    const { data: row } = await supabaseAdmin
      .from("webauthn_challenges")
      .select("id, user_id, expires_at")
      .eq("challenge", challenge)
      .eq("kind", "register")
      .maybeSingle();
    if (!row || row.user_id !== context.userId || Date.parse(row.expires_at) < Date.now()) {
      throw new Error("This registration expired. Try again.");
    }
    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", row.id);

    const verification = await verifyRegistrationResponse({
      response: data.response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("This device could not be verified.");
    }

    const cred = verification.registrationInfo.credential;
    const { error } = await supabaseAdmin.from("user_passkeys").insert({
      user_id: context.userId,
      credential_id: cred.id,
      public_key: Buffer.from(cred.publicKey).toString("base64"),
      counter: cred.counter,
      transports: (cred.transports ?? []).join(","),
      device_label: data.deviceLabel?.trim() || "This device",
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const startPasskeyLogin = createServerFn({ method: "POST" }).handler(async () => {
  const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { rpID } = relyingParty();

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });

  await supabaseAdmin.from("webauthn_challenges").insert({
    challenge: options.challenge,
    kind: "login",
  });

  return options;
});

export const finishPasskeyLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ response: z.any() }).parse(input))
  .handler(async ({ data }): Promise<{ tokenHash: string; email: string }> => {
    const { verifyAuthenticationResponse } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID, origin } = relyingParty();

    const clientData = data.response?.response?.clientDataJSON as string | undefined;
    if (!clientData) throw new Error("Malformed device response.");
    const challenge = JSON.parse(
      atob(clientData.replace(/-/g, "+").replace(/_/g, "/")),
    ).challenge as string;

    const { data: chal } = await supabaseAdmin
      .from("webauthn_challenges")
      .select("id, expires_at")
      .eq("challenge", challenge)
      .eq("kind", "login")
      .maybeSingle();
    if (!chal || Date.parse(chal.expires_at) < Date.now()) {
      throw new Error("That sign-in attempt expired. Try again.");
    }
    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", chal.id);

    const { data: cred } = await supabaseAdmin
      .from("user_passkeys")
      .select("id, user_id, credential_id, public_key, counter, transports")
      .eq("credential_id", data.response.id as string)
      .maybeSingle();
    if (!cred) throw new Error("This device is not registered for biometric sign-in.");

    const verification = await verifyAuthenticationResponse({
      response: data.response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: cred.credential_id,
        publicKey: new Uint8Array(Buffer.from(cred.public_key, "base64")),
        counter: Number(cred.counter),
        transports: cred.transports
          ? (cred.transports.split(",").filter(Boolean) as ("usb" | "nfc" | "ble" | "internal" | "hybrid")[])
          : undefined,
      },
    });
    if (!verification.verified) throw new Error("Biometric check failed.");

    await supabaseAdmin
      .from("user_passkeys")
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", cred.id);

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(cred.user_id);
    if (userErr || !userRes.user?.email) throw new Error("Could not load that account.");

    // Mint a single-use verified sign-in token for the account that owns this device.
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userRes.user.email,
    });
    if (linkErr || !link.properties?.hashed_token) {
      throw new Error("Could not start a session for this account.");
    }

    return { tokenHash: link.properties.hashed_token, email: userRes.user.email };
  });
