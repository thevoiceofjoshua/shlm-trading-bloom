import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { HomeButton } from "@/components/HomeButton";
import { listApplications, sendPaymentLink, denyApplication, removeApplication, type ApplicationList } from "@/lib/admin.functions";
import { SITE_TIMEZONE, SITE_TIMEZONE_LABEL } from "@/lib/time";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "SHLM Admin" }, { name: "robots", content: "noindex" }],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/admin" }],
  }),
});

function AdminPage() {
  const listFn = useServerFn(listApplications);
  const sendFn = useServerFn(sendPaymentLink);
  const denyFn = useServerFn(denyApplication);
  const queryClient = useQueryClient();

  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcode, setPasscode] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [actingId, setActingId] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "deny" | "resend" | null>(null);
  const [sendMsg, setSendMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [emailState, setEmailState] = useState<Record<string, "sending" | "sent" | "failed">>({});


  const {
    data: apps,
    isLoading: loadingApps,
    error: appsError,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["applications", passcode],
    queryFn: () => listFn({ data: { passcode } }),
    enabled: passcode.length > 0,
    retry: false,
  });

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this applicant and send the payment link email?")) return;
    setActingId(id);
    setAction("approve");
    setSendMsg(null);
    setEmailState((s) => ({ ...s, [id]: "sending" }));
    try {
      await sendFn({
        data: { passcode, applicationId: id, origin: window.location.origin },
      });
      setSendMsg({ id, ok: true, text: "Approved — payment link sent." });
      setEmailState((s) => ({ ...s, [id]: "sent" }));
      queryClient.invalidateQueries({ queryKey: ["applications", passcode] });
    } catch (e) {
      setSendMsg({ id, ok: false, text: e instanceof Error ? e.message : "Failed to send" });
      setEmailState((s) => ({ ...s, [id]: "failed" }));
    } finally {
      setActingId(null);
      setAction(null);
    }
  };

  const handleResend = async (id: string) => {
    if (!confirm("Resend the payment link email to this applicant?")) return;
    setActingId(id);
    setAction("resend");
    setSendMsg(null);
    setEmailState((s) => ({ ...s, [id]: "sending" }));
    try {
      await sendFn({
        data: { passcode, applicationId: id, origin: window.location.origin },
      });
      setSendMsg({ id, ok: true, text: "Payment link email resent." });
      setEmailState((s) => ({ ...s, [id]: "sent" }));
      queryClient.invalidateQueries({ queryKey: ["applications", passcode] });
    } catch (e) {
      setSendMsg({ id, ok: false, text: e instanceof Error ? e.message : "Failed to resend" });
      setEmailState((s) => ({ ...s, [id]: "failed" }));
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
    setEmailState((s) => ({ ...s, [id]: "sending" }));
    try {
      await denyFn({ data: { passcode, applicationId: id } });
      setSendMsg({ id, ok: true, text: "Denied — email sent." });
      setEmailState((s) => ({ ...s, [id]: "sent" }));
      queryClient.invalidateQueries({ queryKey: ["applications", passcode] });
    } catch (e) {
      setSendMsg({ id, ok: false, text: e instanceof Error ? e.message : "Failed to deny" });
      setEmailState((s) => ({ ...s, [id]: "failed" }));
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

  const statusBadge = (app: ApplicationList[number]) => {
    if (app.status === "approved") {
      return (
        <span className="rounded-full border border-foreground px-3 py-1 text-xs font-medium uppercase tracking-wider text-foreground">
          Approved
        </span>
      );
    }
    if (app.status === "denied") {
      return (
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Denied
        </span>
      );
    }
    return null;
  };

  const emailBadge = (app: ApplicationList[number]) => {
    const live = emailState[app.id];
    let text: string | null = null;
    if (live === "sending") text = "Email sending…";
    else if (live === "sent") text = "Email delivered";
    else if (live === "failed") text = "Email failed";
    else if (app.status === "approved") text = app.payment_link_sent_at ? "Email delivered" : "Email pending";
    else if (app.status === "denied") text = "Email delivered";
    if (!text) return null;
    const failed = live === "failed";
    return (
      <span
        className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider ${
          failed
            ? "border-destructive text-destructive"
            : live === "sending"
              ? "border-border text-muted-foreground"
              : "border-border text-foreground"
        }`}
      >
        {text}
      </span>
    );
  };

  const selected = apps?.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl font-medium tracking-tight">SHLM Admin</h1>
          <HomeButton />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Review mentorship applications.</p>

        <form
          className="mt-8 rounded-2xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setPasscode(passcodeInput.trim());
          }}
        >
          <label className="text-sm font-medium" htmlFor="admin-passcode">
            Admin passcode
          </label>
          <input
            id="admin-passcode"
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Type passcode and press Enter"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {passcode ? "Unlocked." : "Press Enter to unlock applications."}
          </p>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>


        {selected ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedId(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to applications
              </button>
              <button
                onClick={() => setSelectedId(null)}
                aria-label="Close"
                className="rounded-full border border-border px-3 py-1 text-sm text-foreground hover:bg-muted"
              >
                Exit
              </button>
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-medium">{selected.full_name}</h2>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {tierLabel(selected.tier)}
                </span>
                {statusBadge(selected)}
                {emailBadge(selected)}
              </div>
              <p className="mt-2 text-sm text-foreground">{selected.email}</p>
              {selected.phone && <p className="text-sm text-muted-foreground">{selected.phone}</p>}

              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Scheduled call</p>
                  <p className="mt-1 text-foreground">
                    {formatTime(selected.scheduled_at, selected.timezone)} ({selected.timezone || SITE_TIMEZONE_LABEL})
                  </p>
                </div>
                {selected.experience && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Experience</p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{selected.experience}</p>
                  </div>
                )}
                {selected.goals && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Goals</p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{selected.goals}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Applied</p>
                  <p className="mt-1 text-foreground">
                    {new Date(selected.created_at).toLocaleString("en-US", {
                      timeZone: SITE_TIMEZONE,
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>

              {selected.status === "new" ? (
                <div className="mt-8 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleApprove(selected.id)}
                    disabled={actingId === selected.id}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
                  >
                    {actingId === selected.id && action === "approve" ? "Approving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleDeny(selected.id)}
                    disabled={actingId === selected.id}
                    className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {actingId === selected.id && action === "deny" ? "Denying…" : "Deny"}
                  </button>
                </div>
              ) : (
                <div className="mt-8 space-y-3">
                  {selected.status === "approved" && (
                    <button
                      onClick={() => handleResend(selected.id)}
                      disabled={actingId === selected.id}
                      className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {actingId === selected.id && action === "resend" ? "Resending…" : "Resend email"}
                    </button>
                  )}
                <p className="text-xs text-muted-foreground">
                  {selected.status === "approved"
                    ? `Approved${selected.payment_link_sent_at ? ` · payment link sent ${new Date(selected.payment_link_sent_at).toLocaleDateString("en-US")}` : ""}.`
                    : "Denied."}
                </p>
                </div>
              )}

              {sendMsg?.id === selected.id && (
                <p className={`mt-4 text-sm ${sendMsg.ok ? "text-foreground" : "text-destructive"}`}>
                  {sendMsg.text}
                </p>
              )}
            </div>
          </div>
        ) : (
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
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {apps.map((app: ApplicationList[number]) => (
                  <li
                    key={app.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      onClick={() => setSelectedId(app.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg font-medium text-foreground hover:underline">
                          {app.full_name}
                        </span>
                        {statusBadge(app)}
                        {emailBadge(app)}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tierLabel(app.tier)} · Applied{" "}
                        {new Date(app.created_at).toLocaleDateString("en-US", { timeZone: SITE_TIMEZONE })}
                      </p>
                    </button>

                    {app.status === "new" ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
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
                    ) : app.status === "approved" ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          onClick={() => handleResend(app.id)}
                          disabled={actingId === app.id}
                          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          {actingId === app.id && action === "resend" ? "Resending…" : "Resend email"}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
