import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface TradovateStatus {
  connected: boolean;
  environment: "demo" | "live" | null;
  accountName: string | null;
  lastUsedAt: string | null;
}

export interface ImportResult {
  trades: {
    instrument: string;
    direction: "long" | "short";
    result: "win" | "loss" | "breakeven";
    pnl: string;
    qty: number;
    entryPrice: number;
    exitPrice: number;
    entryTime: string;
    exitTime: string;
  }[];
  message?: string;
}

const connectSchema = z.object({
  environment: z.enum(["demo", "live"]),
  username: z.string().trim().min(1),
  password: z.string().min(1),
  appId: z.string().trim().default("SHLM Journal"),
  appVersion: z.string().trim().default("1.0"),
  cid: z.coerce.number().int().positive(),
  sec: z.string().trim().min(1),
  deviceId: z.string().trim().optional(),
});

export const getTradovateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TradovateStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("tradovate_connections")
      .select("environment, account_name, last_used_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!data) return { connected: false, environment: null, accountName: null, lastUsedAt: null };
    return {
      connected: true,
      environment: (data.environment as "demo" | "live") ?? "live",
      accountName: data.account_name ?? null,
      lastUsedAt: data.last_used_at ?? null,
    };
  });

export const connectTradovate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => connectSchema.parse(input))
  .handler(async ({ data, context }): Promise<TradovateStatus & { error?: string }> => {
    const { encryptSecret, requestAccessToken, listAccounts, TradovateError } = await import(
      "@/lib/tradovate.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const creds = {
      name: data.username,
      password: data.password,
      appId: data.appId,
      appVersion: data.appVersion,
      cid: data.cid,
      sec: data.sec,
      deviceId: data.deviceId,
    };

    let token: string;
    let expiresAt: string;
    try {
      const result = await requestAccessToken(data.environment, creds);
      token = result.token;
      expiresAt = result.expiresAt;
    } catch (err) {
      const message =
        err instanceof TradovateError
          ? err.message
          : "Could not reach Tradovate. Try again in a moment.";
      return { connected: false, environment: null, accountName: null, lastUsedAt: null, error: message };
    }

    let accountId: number | null = null;
    let accountName: string | null = null;
    try {
      const accounts = await listAccounts(data.environment, token);
      const primary = accounts.find((a) => a.active) ?? accounts[0];
      accountId = primary?.id ?? null;
      accountName = primary?.name ?? null;
    } catch {
      // Account lookup can fail on freshly provisioned API access; credentials are still valid.
    }

    const encCreds = await encryptSecret(JSON.stringify(creds));
    const encToken = await encryptSecret(token);

    const { error } = await supabaseAdmin.from("tradovate_connections").upsert(
      {
        user_id: context.userId,
        environment: data.environment,
        account_id: accountId,
        account_name: accountName,
        credentials_cipher: encCreds.cipher,
        credentials_iv: encCreds.iv,
        access_token_cipher: encToken.cipher,
        access_token_iv: encToken.iv,
        token_expires_at: expiresAt,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    return { connected: true, environment: data.environment, accountName, lastUsedAt: new Date().toISOString() };
  });

export const disconnectTradovate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tradovate_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { connected: false };
  });

const importSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const importTradovateFills = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => importSchema.parse(input))
  .handler(async ({ data, context }): Promise<ImportResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      decryptSecret,
      encryptSecret,
      requestAccessToken,
      fetchRoundTrips,
      listAccounts,
      TradovateError,
    } = await import("@/lib/tradovate.server");

    const { data: row } = await supabaseAdmin
      .from("tradovate_connections")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!row) {
      return { trades: [], message: "No Tradovate account connected yet. Connect one in your settings first." };
    }

    const environment = (row.environment as "demo" | "live") ?? "live";
    const creds = JSON.parse(await decryptSecret(row.credentials_cipher, row.credentials_iv));

    // Reuse the cached token while it is comfortably valid; otherwise renew silently.
    const expiry = row.token_expires_at ? Date.parse(row.token_expires_at) : 0;
    let token: string | null = null;
    if (row.access_token_cipher && row.access_token_iv && expiry - Date.now() > 2 * 60 * 1000) {
      token = await decryptSecret(row.access_token_cipher, row.access_token_iv);
    }

    try {
      if (!token) {
        const fresh = await requestAccessToken(environment, creds);
        token = fresh.token;
        const encToken = await encryptSecret(fresh.token);
        await supabaseAdmin
          .from("tradovate_connections")
          .update({
            access_token_cipher: encToken.cipher,
            access_token_iv: encToken.iv,
            token_expires_at: fresh.expiresAt,
          })
          .eq("user_id", context.userId);
      }

      let accountId = row.account_id ?? null;
      if (!accountId) {
        const accounts = await listAccounts(environment, token);
        accountId = (accounts.find((a) => a.active) ?? accounts[0])?.id ?? null;
        if (accountId) {
          await supabaseAdmin
            .from("tradovate_connections")
            .update({ account_id: accountId })
            .eq("user_id", context.userId);
        }
      }

      if (!accountId) {
        return {
          trades: [],
          message:
            "Tradovate returned no trading accounts for these credentials. Check that the API Access add-on is active.",
        };
      }

      const trades = await fetchRoundTrips(environment, token, accountId, data.from, data.to);
      await supabaseAdmin
        .from("tradovate_connections")
        .update({ last_used_at: new Date().toISOString() })
        .eq("user_id", context.userId);

      if (trades.length === 0) {
        return {
          trades: [],
          message:
            "No fills found for this window. Tradovate sometimes reports nothing for demo accounts or outside market hours — try widening to the whole day.",
        };
      }
      return { trades };
    } catch (err) {
      const message =
        err instanceof TradovateError ? err.message : "Could not reach Tradovate. Try again in a moment.";
      return { trades: [], message };
    }
  });
