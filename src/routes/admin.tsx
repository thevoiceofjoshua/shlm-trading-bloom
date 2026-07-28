import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { HomeButton } from "@/components/HomeButton";
import { getSiteStats, updateSiteStats, type SiteStats } from "@/lib/site-stats.functions";
import { listApplications, sendPaymentLink, denyApplication, type ApplicationList } from "@/lib/admin.functions";
import { SITE_TIMEZONE, SITE_TIMEZONE_LABEL } from "@/lib/time";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "SHLM Admin" }, { name: "robots", content: "noindex" }],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/admin" }],
  }),
});

function AdminPage() {
  const getFn = useServerFn(getSiteStats);
  const updateFn = useServerFn(updateSiteStats);
  const listFn = useServerFn(listApplications);
  const sendFn = useServerFn(sendPaymentLink);
  const denyFn = useServerFn(denyApplication);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["site_stats"], queryFn: () => getFn() });

  const [passcode, setPasscode] = useState("");
  const [tab, setTab] = useState<"stats" | "applications">("stats");
  const [form, setForm] = useState<SiteStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [actingId, setActingId] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "deny" | null>(null);
  const [sendMsg, setSendMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const {
    data: apps,
    isLoading: loadingApps,
    error: appsError,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["applications", passcode],
    queryFn: () => listFn({ data: { passcode } }),
    enabled: tab === "applications" && passcode.length > 0,
    retry: false,
  });

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const fields: { key: keyof SiteStats; label: string; hint?: string }[] = [
    { key: "performance_value", label: "Hero performance value", hint: 'e.g. "Tracking", "+12.4%"' },
    { key: "performance_note", label: "Hero performance note" },
    { key: "cohort_value", label: "Cohort stat value", hint: 'e.g. "New", "42"' },
    { key: "cohort_label", label: "Cohort stat label" },
    { key: "results_value", label: "Results stat value", hint: 'e.g. "Live", "+8.1%"' },
    { key: "results_label", label: "Results stat label" },
    { key: "hero_note", label: "Hero banner note" },
  ];

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateFn({
        data: {
          passcode,
          stats: Object.fromEntries(fields.map((f) => [f.key, form![f.key]])) as Partial<SiteStats>,
        },
      });
      setMsg({ ok: true, text: "Stats updated. The landing page will reflect them on next load." });
      router.invalidate();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this applicant and send the payment link email?")) return;
    setActingId(id);
    setAction("approve");
    setSendMsg(null);
    try {
      await sendFn({
        data: { passcode, applicationId: id, origin: window.location.origin, promoCode: "1MILL" },
      });
      setSendMsg({ id, ok: true, text: "Approved — payment link sent." });
      queryClient.invalidateQueries({ queryKey: ["applications", passcode] });
    } catch (e) {
      setSendMsg({ id, ok: false, text: e instanceof Error ? e.message : "Failed to send" });
    } finally {
      setActingId(null);
      setAction(null);
    }
  };

  const handleDeny = async (id: string) => {
    if (!confirm("Deny this applicant? A denial email will be sent.")) return;
    setActingId(id);
    setAction("deny");
    setSendMsg(null);
    try {
      await denyFn({ data: { passcode, applicationId: id } });
      setSendMsg({ id, ok: true, text: "Denied — email sent." });
      queryClient.invalidateQueries({ queryKey: ["applications", passcode] });
    } catch (e) {
      setSendMsg({ id, ok: false, text: e instanceof Error ? e.message : "Failed to deny" });
    } finally {
      setActingId(null);
      setAction(null);
    }
  };

  const tierLabel = (tier: string) => {
    const map: Record<string, string> = {
      foundation: "Beginner",
      mentorship: "Intermediate",
      elite: "Advanced",
    };
    return map[tier] || tier;
  };

  const formatTime = (iso: string | null, tz: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-US", {
        timeZone: tz || SITE_TIMEZONE,
        dateStyle: "full",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  if (isLoading || !form) {
    return (
      <div className="min-h-screen bg-background px-6 py-16 text-foreground">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl font-medium tracking-tight">SHLM Admin</h1>
          <HomeButton />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Manage live stats and review mentorship applications.</p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <label className="text-sm font-medium">Admin passcode</label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter passcode to unlock admin features"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setTab("stats")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-opacity ${
              tab === "stats"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Live stats
          </button>
          <button
            onClick={() => setTab("applications")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-opacity ${
              tab === "applications"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Applications
          </button>
        </div>

        {tab === "stats" && (
          <div className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="text-sm font-medium">{f.label}</label>
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                <input
                  type="text"
                  value={(form[f.key] as string) ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </div>
            ))}

            <button
              onClick={handleSave}
              disabled={saving || !passcode}
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            {msg && <p className={`text-sm ${msg.ok ? "text-foreground" : "text-destructive"}`}>{msg.text}</p>}

            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(form.updated_at).toLocaleString("en-US", { timeZone: SITE_TIMEZONE })} {SITE_TIMEZONE_LABEL}
            </p>
          </div>
        )}

        {tab === "applications" && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-medium">Applications</h2>
              <button
                onClick={() => refetchApps()}
                disabled={loadingApps || !passcode}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {loadingApps ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {!passcode && (
              <p className="text-sm text-muted-foreground">Enter the admin passcode above to view applications.</p>
            )}

            {passcode && loadingApps && <p className="text-sm text-muted-foreground">Loading…</p>}

            {passcode && appsError && (
              <p className="text-sm text-destructive">
                {appsError instanceof Error ? appsError.message : "Failed to load applications"}
              </p>
            )}

            {passcode && apps && apps.length === 0 && (
              <p className="text-sm text-muted-foreground">No applications yet.</p>
            )}

            {passcode && apps && apps.length > 0 && (
              <div className="space-y-4">
                {apps.map((app: ApplicationList[number]) => (
                  <div key={app.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-lg font-medium">{app.full_name}</p>
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {tierLabel(app.tier)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-foreground">{app.email}</p>
                        {app.phone && <p className="text-sm text-muted-foreground">{app.phone}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Call: {formatTime(app.scheduled_at, app.timezone)} ({app.timezone || SITE_TIMEZONE_LABEL})
                        </p>
                        {app.experience && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{app.experience}</p>
                        )}
                        {app.goals && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{app.goals}</p>}
                        <p className="mt-3 text-xs text-muted-foreground">
                          Applied{" "}
                          {new Date(app.created_at).toLocaleString("en-US", {
                            timeZone: SITE_TIMEZONE,
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                        {app.status === "approved" ? (
                          <span className="rounded-full border border-foreground px-3 py-1 text-xs font-medium uppercase tracking-wider text-foreground">
                            Approved{app.payment_link_sent_at ? ` · link sent ${new Date(app.payment_link_sent_at).toLocaleDateString("en-US")}` : ""}
                          </span>
                        ) : app.status === "denied" ? (
                          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Denied
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={actingId === app.id}
                              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
                            >
                              {actingId === app.id && action === "approve" ? "Approving…" : "Approve"}
                            </button>
                            <button
                              onClick={() => handleDeny(app.id)}
                              disabled={actingId === app.id}
                              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                            >
                              {actingId === app.id && action === "deny" ? "Denying…" : "Deny"}
                            </button>
                          </div>
                        )}
                        {sendMsg?.id === app.id && (
                          <p className={`text-xs ${sendMsg.ok ? "text-foreground" : "text-destructive"}`}>
                            {sendMsg.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
