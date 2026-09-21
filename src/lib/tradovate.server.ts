/**
 * Server-only Tradovate integration.
 *
 * Credentials are encrypted with AES-256-GCM using TRADOVATE_ENC_KEY before they
 * are stored, are only ever decrypted inside this module, and never leave the server.
 */

export type TradovateEnvironment = "demo" | "live";

export interface TradovateCredentials {
  name: string;
  password: string;
  appId: string;
  appVersion: string;
  cid: number;
  sec: string;
  deviceId?: string;
}

export interface ImportedTrade {
  instrument: string;
  direction: "long" | "short";
  result: "win" | "loss" | "breakeven";
  pnl: string;
  qty: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
}

const BASE: Record<TradovateEnvironment, string> = {
  demo: "https://demo.tradovateapi.com/v1",
  live: "https://live.tradovateapi.com/v1",
};

/* ------------------------------ encryption -------------------------------- */

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (const byte of view) out += String.fromCharCode(byte);
  return btoa(out);
}

function unb64(value: string): Uint8Array {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function aesKey(): Promise<CryptoKey> {
  const secret = process.env["TRADOVATE_ENC_KEY"];
  if (!secret) throw new Error("Tradovate encryption key is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plaintext: string): Promise<{ cipher: string; iv: string }> {
  const key = await aesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { cipher: b64(cipher), iv: b64(iv) };
}

export async function decryptSecret(cipher: string, iv: string): Promise<string> {
  const key = await aesKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv) },
    key,
    unb64(cipher),
  );
  return new TextDecoder().decode(plain);
}

/* ------------------------------ api helpers ------------------------------- */

export class TradovateError extends Error {}

async function api<T>(
  env: TradovateEnvironment,
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE[env]}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) throw new TradovateError("Tradovate rejected the saved session. Reconnect your account.");
  if (res.status === 429) throw new TradovateError("Tradovate is rate limiting requests. Try again in a minute.");
  if (!res.ok) throw new TradovateError(`Tradovate request failed (${res.status}).`);
  return (await res.json()) as T;
}

/** Requests a fresh access token. Returns the token plus its expiry. */
export async function requestAccessToken(
  env: TradovateEnvironment,
  creds: TradovateCredentials,
): Promise<{ token: string; expiresAt: string }> {
  const res = await fetch(`${BASE[env]}/auth/accesstokenrequest`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      name: creds.name,
      password: creds.password,
      appId: creds.appId || "SHLM Journal",
      appVersion: creds.appVersion || "1.0",
      cid: creds.cid,
      sec: creds.sec,
      deviceId: creds.deviceId ?? "shlm-journal",
    }),
  });

  if (!res.ok) {
    throw new TradovateError(
      res.status === 401
        ? "Tradovate rejected those credentials. Check your username, password, CID and secret."
        : `Tradovate sign-in failed (${res.status}).`,
    );
  }

  const data = (await res.json()) as {
    accessToken?: string;
    expirationTime?: string;
    errorText?: string;
    "p-ticket"?: string;
    "p-time"?: number;
  };

  if (data["p-ticket"]) {
    throw new TradovateError(
      `Tradovate is throttling sign-ins (captcha/penalty). Wait ${data["p-time"] ?? 60}s and try again.`,
    );
  }
  if (data.errorText || !data.accessToken) {
    throw new TradovateError(data.errorText || "Tradovate did not return an access token.");
  }

  return {
    token: data.accessToken,
    expiresAt: data.expirationTime ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

export async function listAccounts(env: TradovateEnvironment, token: string) {
  return api<{ id: number; name: string; active?: boolean }[]>(env, "/account/list", token);
}

/* ------------------------------ fill mapping ------------------------------ */

interface FillPair {
  id: number;
  positionId: number;
  buyFillId: number;
  sellFillId: number;
  qty: number;
  buyPrice: number;
  sellPrice: number;
}

interface Fill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  tradeDate?: { year: number; month: number; day: number };
  accountId?: number;
  action: "Buy" | "Sell";
  qty: number;
  price: number;
}

interface Contract {
  id: number;
  name: string;
  productId?: number;
}

interface Product {
  id: number;
  name: string;
  valuePerPoint?: number;
}

/**
 * Fetches round-trip trades between two instants for one account.
 * Returns an empty array when Tradovate reports no activity.
 */
export async function fetchRoundTrips(
  env: TradovateEnvironment,
  token: string,
  accountId: number,
  fromISO: string,
  toISO: string,
): Promise<ImportedTrade[]> {
  const [pairs, fills] = await Promise.all([
    api<FillPair[]>(env, "/fillPair/list", token),
    api<Fill[]>(env, "/fill/list", token),
  ]);

  const fillById = new Map<number, Fill>();
  for (const f of fills ?? []) fillById.set(f.id, f);

  const from = Date.parse(fromISO);
  const to = Date.parse(toISO);

  const contractIds = new Set<number>();
  const usable = (pairs ?? []).filter((p) => {
    const buy = fillById.get(p.buyFillId);
    const sell = fillById.get(p.sellFillId);
    if (!buy || !sell) return false;
    if (buy.accountId != null && buy.accountId !== accountId) return false;
    const stamps = [Date.parse(buy.timestamp), Date.parse(sell.timestamp)];
    const inWindow = stamps.some((t) => t >= from && t <= to);
    if (!inWindow) return false;
    contractIds.add(buy.contractId);
    return true;
  });

  if (usable.length === 0) return [];

  const contracts = new Map<number, Contract>();
  const products = new Map<number, Product>();
  await Promise.all(
    [...contractIds].map(async (id) => {
      try {
        const c = await api<Contract>(env, `/contract/item?id=${id}`, token);
        contracts.set(id, c);
        if (c.productId && !products.has(c.productId)) {
          const p = await api<Product>(env, `/product/item?id=${c.productId}`, token);
          products.set(c.productId, p);
        }
      } catch {
        // Contract lookup is cosmetic; fall back to the raw id below.
      }
    }),
  );

  const trades: ImportedTrade[] = [];
  for (const p of usable) {
    const buy = fillById.get(p.buyFillId)!;
    const sell = fillById.get(p.sellFillId)!;
    const contract = contracts.get(buy.contractId);
    const product = contract?.productId ? products.get(contract.productId) : undefined;
    const valuePerPoint = product?.valuePerPoint ?? 1;

    const longFirst = Date.parse(buy.timestamp) <= Date.parse(sell.timestamp);
    const entry = longFirst ? buy : sell;
    const exit = longFirst ? sell : buy;
    const gross = (p.sellPrice - p.buyPrice) * p.qty * valuePerPoint;
    const rounded = Math.round(gross * 100) / 100;

    trades.push({
      instrument: contract?.name ?? `Contract ${buy.contractId}`,
      direction: longFirst ? "long" : "short",
      result: rounded > 0 ? "win" : rounded < 0 ? "loss" : "breakeven",
      pnl: String(rounded),
      qty: p.qty,
      entryPrice: entry.price,
      exitPrice: exit.price,
      entryTime: entry.timestamp,
      exitTime: exit.timestamp,
    });
  }

  trades.sort((a, b) => Date.parse(a.entryTime) - Date.parse(b.entryTime));
  return trades;
}
