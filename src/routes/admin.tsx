import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAdminMode } from "@/hooks/use-admin-mode";
import { HomeButton } from "@/components/HomeButton";
import { VaultCredentialFrame, VaultField } from "@/components/VaultCredentialFrame";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  fetchApplications,
  sendPaymentLinkRequest,
  denyApplicationRequest,
  removeApplicationRequest,
  fetchAccounts,
  setUserRoleRequest,
  type AdminApplication,
  type AdminAccount,
  type ManagedRole,
} from "@/lib/admin-client";
import { SITE_TIMEZONE, SITE_TIMEZONE_LABEL } from "@/lib/time";

type ApplicationList = AdminApplication[];

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "SHLM Founder" }, { name: "robots", content: "noindex" }],
    links: [{ rel: "canonical", href: "https://shlm-trading-bloom.lovable.app/admin" }],
  }),
});

function AdminPage() {
  const queryClient = useQueryClient();


  // Admin mode already verified the passcode this session — reuse it so the
  // console unlocks without retyping. Manual entry still works as a fallback.
  const { adminMode, passcode: sessionPasscode, role, checked } = useAdminMode();
  const modOnlyAccount = checked && role === "shlm_mod";
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcode, setPasscode] = useState("");

  useEffect(() => {
    if (modOnlyAccount) return;
    if (adminMode && sessionPasscode && !passcode) setPasscode(sessionPasscode);
  }, [adminMode, sessionPasscode, passcode, modOnlyAccount]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [actingId, setActingId] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "deny" | "resend" | "remove" | null>(null);
  const [sendMsg, setSendMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [emailState, setEmailState] = useState<Record<string, "sending" | "sent" | "failed">>({});


  const {
    data: apps,
    isLoading: loadingApps,
    error: appsError,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["applications", passcode],
    queryFn: () => fetchApplications(passcode),
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
      await sendPaymentLinkRequest(passcode, id);
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
      await sendPaymentLinkRequest(passcode, id);
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
      await denyApplicationRequest(passcode, id);
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

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this applicant permanently? This cannot be undone.")) return;
    setActingId(id);
    setAction("remove");
    setSendMsg(null);
    try {
      await removeApplicationRequest(passcode, id);
      setSelectedId((cur) => (cur === id ? null : cur));
      queryClient.invalidateQueries({ queryKey: ["applications", passcode] });
    } catch (e) {
      setSendMsg({ id, ok: false, text: e instanceof Error ? e.message : "Failed to remove" });
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

  if (modOnlyAccount) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            SHLM MOD
          </p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">Not authorized</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            SHLM MOD access covers the SHLM Centre only. The applications console is limited to the
            program owner.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <a
              href="/centre"
              className="flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
            >
              Go to SHLM Centre
            </a>
            <HomeButton />
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-background px-3 py-8 text-foreground xs:px-4 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto min-w-0 max-w-3xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="min-w-0 font-display text-2xl font-medium tracking-tight sm:text-4xl">SHLM Founder</h1>
          <HomeButton />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Review mentorship applications.</p>

        <VaultCredentialFrame className="mt-8" label="SHLM // founder console" status={passcode ? "unlocked" : "locked"}>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            setPasscode(passcodeInput.trim());
          }}
        >
          <VaultField
            label="SHLM Founder passcode"
            id="admin-passcode"
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Type passcode and press Enter"
          />
          <p className="mt-2 font-sans text-xs text-[var(--vault-muted)]">
            {passcode ? "Unlocked." : "Press Enter to unlock applications."}
          </p>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
        </VaultCredentialFrame>


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
                  <button
                    onClick={() => handleRemove(selected.id)}
                    disabled={actingId === selected.id}
                    className="rounded-full border border-destructive px-5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {actingId === selected.id && action === "remove" ? "Removing…" : "Remove"}
                  </button>
                </div>
              ) : (
                <div className="mt-8 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selected.status === "approved" && (
                      <button
                        onClick={() => handleResend(selected.id)}
                        disabled={actingId === selected.id}
                        className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        {actingId === selected.id && action === "resend" ? "Resending…" : "Resend email"}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(selected.id)}
                      disabled={actingId === selected.id}
                      className="rounded-full border border-destructive px-5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {actingId === selected.id && action === "remove" ? "Removing…" : "Remove"}
                    </button>
                  </div>
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

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {app.status === "new" && (
                        <>
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
                        </>
                      )}
                      {app.status === "approved" && (
                        <button
                          onClick={() => handleResend(app.id)}
                          disabled={actingId === app.id}
                          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          {actingId === app.id && action === "resend" ? "Resending…" : "Resend email"}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(app.id)}
                        disabled={actingId === app.id}
                        className="rounded-full border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {actingId === app.id && action === "remove" ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {passcode && <ManageRoles passcode={passcode} />}
      </div>
    </div>
  );
}

const ROLE_OPTIONS: { value: ManagedRole; label: string }[] = [
  { value: "member", label: "Member (no special role)" },
  { value: "free_member", label: "Free member (lifetime)" },
  { value: "shlm_mod", label: "SHLM MOD" },
  { value: "admin", label: "Founder (admin)" },
  { value: "revoked", label: "No access (revoked)" },
];

// Guard against a tap that "passes through" from a just-closed native select
// or a just-opened dialog and lands on the next button.
const TAP_GUARD_MS = 700;

const roleLabel = (role: ManagedRole) =>
  ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;

function ManageRoles({ passcode }: { passcode: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const [drafts, setDrafts] = useState<Record<string, ManagedRole>>({});
  const [pending, setPending] = useState<{ account: AdminAccount; next: ManagedRole } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const selectTouchedAt = useRef(0);
  const pendingOpenedAt = useRef(0);
  const [confirmReady, setConfirmReady] = useState(false);

  const openConfirm = (account: AdminAccount, next: ManagedRole) => {
    if (Date.now() - selectTouchedAt.current < TAP_GUARD_MS) return;
    pendingOpenedAt.current = Date.now();
    setConfirmReady(false);
    setPending({ account, next });
    window.setTimeout(() => setConfirmReady(true), TAP_GUARD_MS);
  };

  const { data: accounts, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-accounts", passcode],
    queryFn: () => fetchAccounts(passcode),
    retry: false,
  });

  const apply = async () => {
    if (!pending) return;
    if (!confirmReady || Date.now() - pendingOpenedAt.current < TAP_GUARD_MS) return;
    setSaving(true);
    setMsg(null);
    try {
      await setUserRoleRequest(passcode, pending.account.id, pending.next);
      setMsg({ id: pending.account.id, ok: true, text: `Updated to ${roleLabel(pending.next)}.` });
      setDrafts((d) => {
        const next = { ...d };
        delete next[pending.account.id];
        return next;
      });
      setPending(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-accounts", passcode] });
    } catch (e) {
      setMsg({
        id: pending.account.id,
        ok: false,
        text: e instanceof Error ? e.message : "Could not update role.",
      });
      setPending(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-12">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="min-w-0 font-display text-xl font-medium">Manage roles</h2>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Every signed-up account. Changes take effect immediately.
      </p>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading accounts…</p>}
      {error && (
        <p className="mt-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load accounts"}
        </p>
      )}

      {accounts && accounts.length > 0 && (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {accounts.map((acc) => {
            const isSelf = user?.id === acc.id;
            const draft = drafts[acc.id] ?? acc.role;
            const changed = draft !== acc.role;
            return (
              <li key={acc.id} className="grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="min-w-0 break-words text-sm font-medium text-foreground">
                    {acc.email ?? "No email"}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {acc.name ? `${acc.name} · ` : ""}
                    {roleLabel(acc.role)} · Joined{" "}
                    {new Date(acc.created_at).toLocaleDateString("en-US", { timeZone: SITE_TIMEZONE })}
                  </p>
                  {msg?.id === acc.id && (
                    <p className={`mt-1 text-xs ${msg.ok ? "text-foreground" : "text-destructive"}`}>
                      {msg.text}
                    </p>
                  )}
                  {isSelf && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      This is your own account — its role is locked.
                    </p>
                  )}
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0">
                  <select
                    value={draft}
                    disabled={isSelf}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [acc.id]: e.target.value as ManagedRole }))
                    }
                    aria-label={`Role for ${acc.email ?? acc.id}`}
                    className="min-h-11 min-w-0 rounded-full border border-input bg-background px-4 text-sm text-foreground disabled:opacity-50"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPending({ account: acc, next: draft })}
                    disabled={!changed || isSelf}
                    className="min-h-11 shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {accounts && accounts.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No accounts yet.</p>
      )}

      {pending && (
        <div className="fixed inset-0 z-[300] flex min-h-dvh items-start justify-center overflow-y-auto bg-background/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-4">
          <VaultCredentialFrame className="my-auto w-full max-w-md" label="SHLM // role change" status="locked">
            <p className="mt-4 font-sans text-sm text-[var(--vault-ink)]">
              Change <span className="font-medium">{pending.account.email ?? pending.account.id}</span> from{" "}
              {roleLabel(pending.account.role)} to {roleLabel(pending.next)}?
            </p>
            <p className="mt-2 font-sans text-xs text-[var(--vault-muted)]">
              This is a privileged change and takes effect immediately.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={apply}
                disabled={saving}
                className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Applying…" : "Confirm change"}
              </button>
              <button
                onClick={() => setPending(null)}
                disabled={saving}
                className="min-h-11 rounded-full border border-border px-5 text-sm font-medium text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </VaultCredentialFrame>
        </div>
      )}
    </section>
  );
}
