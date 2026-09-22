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
