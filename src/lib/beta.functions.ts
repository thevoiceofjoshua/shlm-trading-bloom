import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-only fallback for deployments where newly added runtime secrets have
// not yet been injected. This is a one-way digest, never the beta password.
const BETA_PASSWORD_SHA256 = "3b13e2a4be438358e55150562a734f619939c19bc31d1bcb73cc07c6a9d9163e";

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

function matchesDigest(input: string, expectedDigest: string): boolean {
  const actual = createHash("sha256").update(input, "utf8").digest();
  const expected = Buffer.from(expectedDigest, "hex");
  return timingSafeEqual(actual, expected);
}

/**
 * Beta access password for the SHLM SYSTEM indicator. The password lives only
 * in server env; the browser sends an attempt and gets a boolean back.
 */
export const verifyBetaPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const expected = process.env["BETA_ACCESS_PASSWORD"]?.trim();
    const input = data.password.trim();
    const valid = expected
      ? matches(input, expected)
      : matchesDigest(input, BETA_PASSWORD_SHA256);
    if (!valid) return { ok: false as const, reason: "wrong" as const };
    return { ok: true as const };
  });

/**
 * A beta tester submits their TradingView username; it is emailed to the SHLM
 * desk. Identity comes from the authenticated session, never the browser.
 */
export const submitBetaUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        username: z.string().trim().min(2).max(60),
        note: z.string().trim().max(500).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const claims = (context.claims ?? {}) as Record<string, unknown>;
    const memberEmail = typeof claims["email"] === "string" ? (claims["email"] as string) : "";
    const adminEmail = process.env["ADMIN_NOTIFICATION_EMAIL"] || "joschewagner56@gmail.com";

    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const result = await sendTemplateEmail("beta-username", adminEmail, {
        // Unique per submission so a retry is never silently deduped away.
        idempotencyKey: `beta-username-${context.userId}-${Date.now()}`,
        replyTo: memberEmail || undefined,
        templateData: {
          username: data.username,
          memberEmail,
          note: data.note || "",
        },
      });
      if (!result.sent) {
        return { ok: false as const, error: "The desk inbox is not accepting mail right now." };
      }
      return { ok: true as const };
    } catch (err) {
      console.error("Failed to send beta username notification", err);
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false as const, error: message };
    }
  });
