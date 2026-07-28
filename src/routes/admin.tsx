import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getSiteStats, updateSiteStats, type SiteStats } from "@/lib/site-stats.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "SHLM Admin — Live Stats" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AdminPage() {
  const getFn = useServerFn(getSiteStats);
  const updateFn = useServerFn(updateSiteStats);
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["site_stats"], queryFn: () => getFn() });

  const [passcode, setPasscode] = useState("");
  const [form, setForm] = useState<SiteStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  if (isLoading || !form) {
    return (
      <div className="min-h-screen bg-background px-6 py-16 text-foreground">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

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
          stats: Object.fromEntries(fields.map((f) => [f.key, form[f.key]])) as Partial<SiteStats>,
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

  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl font-medium tracking-tight">Live stats</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update the numbers shown on the landing page. Changes are published instantly.
        </p>

        <div className="mt-10 space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className="text-sm font-medium">Admin passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Required to save"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </div>

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
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          {msg && (
            <p className={`text-sm ${msg.ok ? "text-foreground" : "text-destructive"}`}>{msg.text}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(form.updated_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
