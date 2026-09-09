// Browser-side calls to the public checkout endpoints hosted on Lovable.
// The storefront may run elsewhere (Cloudflare) where the Stripe key and
// service-role database access are unavailable, so these always target the
// Lovable-hosted API base.

const API_BASE =
  (import.meta.env["VITE_APPLICATION_API_BASE"] as string | undefined)?.replace(/\/$/, "") ??
  "https://shlm-trading-bloom.lovable.app";

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/api/public/checkout/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error((json as { error?: string } | null)?.error || "Checkout failed");
  return json as T;
}

export const createCheckoutRequest = (input: {
  origin: string;
  email?: string;
  promoCode?: string;
}) => post<{ url: string | null }>("create", input);

export const createExtensionCheckoutRequest = (input: {
  origin: string;
  months: number;
  email?: string;
}) => post<{ url: string | null; amount: number }>("extension", input);

export const createTestCheckoutRequest = (input: { origin: string }) =>
  post<{ url: string | null }>("test", input);

export const verifyCheckoutRequest = (input: { session_id: string }) =>
  post<{
    paid: boolean;
    tier: string;
    kind: string;
    name: string;
    months: number;
    email: string;
  }>("verify", input);
