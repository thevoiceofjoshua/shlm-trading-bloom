// Browser-side calls to the public admin endpoints hosted on Lovable.
// The storefront may run elsewhere (Cloudflare) where the service-role key is
// unavailable, so these always target the Lovable-hosted API base.

export type AdminApplication = {
  id: string;
  full_name: string;
  email: string;
  tier: string;
  phone: string | null;
  experience: string | null;
  goals: string | null;
  scheduled_at: string | null;
  timezone: string | null;
  status: string;
  payment_link_sent_at: string | null;
  payment_link_status: string | null;
  created_at: string;
};

const API_BASE =
  (import.meta.env["VITE_APPLICATION_API_BASE"] as string | undefined)?.replace(/\/$/, "") ??
  "https://shlm-trading-bloom.lovable.app";

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/api/public/admin/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error((json as { error?: string } | null)?.error || "Request failed");
  return json as T;
}

export const fetchApplications = (passcode: string) =>
  post<AdminApplication[]>("applications", { passcode });

export const sendPaymentLinkRequest = (passcode: string, applicationId: string, promoCode?: string) =>
  post<{ sent: boolean; sessionId: string }>("send-payment-link", { passcode, applicationId, promoCode });

export const denyApplicationRequest = (passcode: string, applicationId: string) =>
  post<{ denied: boolean }>("deny-application", { passcode, applicationId });

export const removeApplicationRequest = (passcode: string, applicationId: string) =>
  post<{ removed: boolean }>("remove-application", { passcode, applicationId });
