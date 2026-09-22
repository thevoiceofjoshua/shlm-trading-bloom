import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
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
    if (!expected) return { ok: false as const, reason: "unset" as const };
    if (!matches(data.password.trim(), expected)) return { ok: false as const, reason: "wrong" as const };
    return { ok: true as const };
  });
