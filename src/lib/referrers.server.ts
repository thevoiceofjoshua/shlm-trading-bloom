import { displayFirstName } from "@/lib/display-name";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Recruiters selectable as referrers. Public-safe: id + name only, never emails. */
export async function listReferrers(admin: Admin): Promise<{ id: string; name: string }[]> {
  const { data, error } = await admin.from("user_roles").select("user_id").eq("role", "recruiter" as any);
  if (error) throw new Error(error.message);
  const ids = [...new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id))];
  const out: { id: string; name: string }[] = [];
  for (const id of ids) {
    const { data: u } = await admin.auth.admin.getUserById(id);
    const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const full =
      (typeof meta["full_name"] === "string" && (meta["full_name"] as string).trim()) ||
      (typeof meta["name"] === "string" && (meta["name"] as string).trim()) ||
      "";
    const raw = full || displayFirstName(null, u?.user?.email);
    // Tidy casing: "tipis ivy" -> "Tipis Ivy"
    const name = raw.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
    out.push({ id, name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Pacific calendar month as YYYY-MM-01 (matches the recruiter ledger). */
export function pacificMonth(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit" }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}-01`;
}

/** +1 land for the application's referring recruiter. Idempotent per application. */
export async function creditReferral(admin: Admin, applicationId: string) {
  const { data: app } = await admin
    .from("applications")
    .select("referred_by_recruiter_id")
    .eq("id", applicationId)
    .maybeSingle();
  const recruiterId = (app as any)?.referred_by_recruiter_id as string | null | undefined;
  if (!recruiterId) return;
  const { error } = await admin.from("recruiter_lands" as any).insert({
    recruiter_id: recruiterId,
    delta: 1,
    month: pacificMonth(),
    application_id: applicationId,
    created_by: null,
  });
  if (error && error.code !== "23505") console.error("Referral credit failed", error.message);
}
