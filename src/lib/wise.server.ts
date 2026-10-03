/**
 * Wise API client (server only). The Founder's Wise token is stored encrypted
 * (AES-256-GCM, WISE_ENC_KEY) in wise_connection and is only ever decrypted
 * inside server handlers — it is never returned to any browser.
 */
export type WiseMode = "sandbox" | "live";

const BASE: Record<WiseMode, string> = {
  sandbox: "https://api.sandbox.transferwise.tech",
  live: "https://api.wise.com",
};

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function aesKey(): Promise<CryptoKey> {
  const secret = process.env["WISE_ENC_KEY"];
  if (!secret) throw new Error("Wise encryption key is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(plain));
  return { cipher: b64(c), iv: b64(iv) };
}

async function decryptToken(cipher: string, iv: string) {
  const p = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await aesKey(), unb64(cipher));
  return new TextDecoder().decode(p);
}

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function getActiveMode(): Promise<{ mode: WiseMode; sandboxVerified: boolean }> {
  const db = await admin();
  const { data } = await db.from("wise_settings").select("active_mode, sandbox_verified_at").eq("id", 1).maybeSingle();
  return { mode: (data?.active_mode ?? "sandbox") as WiseMode, sandboxVerified: !!data?.sandbox_verified_at };
}

export async function getConnection(mode: WiseMode) {
  const db = await admin();
  const { data } = await db.from("wise_connection").select("*").eq("mode", mode).maybeSingle();
  if (!data) throw new Error(`Wise (${mode}) is not connected yet.`);
  return { token: await decryptToken(data.token_cipher, data.token_iv), profileId: Number(data.profile_id) };
}

export class WiseError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

export async function wiseFetch(mode: WiseMode, token: string, path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(BASE[mode] + path, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.message || json?.message || json?.error_description || json?.error || `Wise request failed (${res.status})`;
    console.error("Wise error", path.replace(/\d{4,}/g, ":id"), res.status, msg);
    throw new WiseError(res.status, String(msg), json);
  }
  return json;
}

/** Map a Wise transfer state to our ledger status. */
export function mapStatus(wise: string | null | undefined): string {
  switch (wise) {
    case "outgoing_payment_sent":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "funds_refunded":
    case "bounced_back":
    case "charged_back":
      return "failed";
    case "incoming_payment_waiting":
    case "waiting_recipient_input_to_proceed":
      return "awaiting_funding";
    default:
      return "processing";
  }
}

const FINAL = new Set(["completed", "failed", "cancelled"]);

/** Re-read a payout's transfer from Wise (the source of truth) and update the ledger. */
export async function refreshPayout(row: { id: string; mode: WiseMode; wise_transfer_id: number | null; status: string }) {
  if (!row.wise_transfer_id || FINAL.has(row.status)) return row.status;
  const { token } = await getConnection(row.mode);
  const t = await wiseFetch(row.mode, token, `/v1/transfers/${row.wise_transfer_id}`);
  const status = mapStatus(t?.status);
  const db = await admin();
  await db.from("recruiter_payouts").update({ status, wise_status: t?.status ?? null }).eq("id", row.id);
  if (status === "completed" && row.mode === "sandbox") {
    await db.from("wise_settings").update({ sandbox_verified_at: new Date().toISOString() }).eq("id", 1).is("sandbox_verified_at", null);
  }
  return status;
}

/** Set "a.b.c" style keys as nested objects, as Wise's recipient API expects. */
export function nestDetails(flat: Record<string, string>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (v === "" || v == null) continue;
    const parts = k.split(".");
    let cur = out;
    parts.slice(0, -1).forEach((p) => (cur = cur[p] ??= {}));
    cur[parts[parts.length - 1]!] = v;
  }
  return out;
}

export function last4Of(flat: Record<string, string>): string | null {
  const keys = ["iban", "IBAN", "accountNumber", "clabe", "cardNumber", "account_number", "bsb"];
  for (const k of keys) {
    const v = flat[k];
    if (v) return v.replace(/\s/g, "").slice(-4);
  }
  return null;
}
