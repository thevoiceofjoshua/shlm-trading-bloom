import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LAND_RATE, BONUS_PER, BONUS_AMOUNT } from "@/lib/recruiters.functions";

const modeSchema = z.enum(["sandbox", "live"]);

async function rolesOf(userId: string) {
  const { admin } = await import("@/lib/wise.server");
  const db = await admin();
  const { data, error } = await db.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Role lookup failed");
  const held = ((data ?? []) as { role: string }[]).map((r) => r.role);
  return { isFounder: held.includes("admin"), isRecruiter: held.includes("recruiter") };
}
async function requireFounder(userId: string) {
  if (!(await rolesOf(userId)).isFounder) throw new Error("NOT_AUTHORIZED");
}
async function isRecruiterId(id: string) {
  return (await rolesOf(id)).isRecruiter;
}

/* ---------------- Founder: connection ---------------- */

export const getWiseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context.userId);
    const { admin, getActiveMode } = await import("@/lib/wise.server");
    const db = await admin();
    const { data } = await db.from("wise_connection").select("mode, profile_name, connected_at");
    const rows = (data ?? []) as { mode: string; profile_name: string | null; connected_at: string }[];
    const pick = (m: string) => {
      const r = rows.find((x) => x.mode === m);
      return r ? { connected: true, profileName: r.profile_name, connectedAt: r.connected_at } : { connected: false, profileName: null, connectedAt: null };
    };
    const s = await getActiveMode();
    return { activeMode: s.mode, sandboxVerified: s.sandboxVerified, sandbox: pick("sandbox"), live: pick("live") };
  });

export const saveWiseToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ mode: modeSchema, token: z.string().trim().min(10).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context.userId);
    const { admin, wiseFetch, encryptToken } = await import("@/lib/wise.server");
    let profiles: any[];
    try {
      profiles = await wiseFetch(data.mode, data.token, "/v2/profiles");
    } catch {
      throw new Error(`Wise rejected that token for ${data.mode}. Check it was created in the ${data.mode === "sandbox" ? "sandbox" : "live"} Wise site.`);
    }
    // Payouts are sent from the Founder's PERSONAL Wise profile.
    const p = (profiles ?? []).find((x) => String(x.type).toUpperCase() === "PERSONAL");
    if (!p) throw new Error("No personal profile found on that Wise account.");
    const enc = await encryptToken(data.token);
    const db = await admin();
    const { error } = await db.from("wise_connection").upsert(
      {
        mode: data.mode,
        token_cipher: enc.cipher,
        token_iv: enc.iv,
        profile_id: p.id,
        profile_name:
          p.fullName ??
          ([p.details?.firstName, p.details?.lastName].filter(Boolean).join(" ") || "Personal Wise profile"),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "mode" },
    );
    if (error) throw new Error("Could not save the connection.");
    return { ok: true };
  });

export const disconnectWise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ mode: modeSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context.userId);
    const { admin } = await import("@/lib/wise.server");
    await (await admin()).from("wise_connection").delete().eq("mode", data.mode);
    return { ok: true };
  });

export const setWiseMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ mode: modeSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context.userId);
    const { admin } = await import("@/lib/wise.server");
    await (await admin()).from("wise_settings").update({ active_mode: data.mode }).eq("id", 1);
    return { ok: true };
  });

/* ---------------- Recruiter: bank details ---------------- */

export type ReqField = {
  key: string;
  name: string;
  type: string;
  required: boolean;
  refresh: boolean;
  example?: string;
  options?: { key: string; name: string }[];
};
export type ReqType = { type: string; title: string; fields: ReqField[] };

export const getBankRequirements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        currency: z.string().regex(/^[A-Z]{3}$/),
        type: z.string().max(60).optional(),
        details: z.record(z.string(), z.string().max(200)).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isRecruiterId(context.userId))) throw new Error("NOT_AUTHORIZED");
    const { getActiveMode, getConnection, wiseFetch, nestDetails } = await import("@/lib/wise.server");
    const { mode } = await getActiveMode();
    const { token } = await getConnection(mode).catch(() => {
      throw new Error("Payouts aren't set up yet. Ask the Founder to connect Wise.");
    });
    const qs = `?source=USD&target=${data.currency}&sourceAmount=100`;
    const raw = data.type
      ? await wiseFetch(mode, token, `/v1/account-requirements${qs}`, {
          method: "POST",
          body: { type: data.type, details: nestDetails(data.details ?? {}) },
        })
      : await wiseFetch(mode, token, `/v1/account-requirements${qs}`);
    const types: ReqType[] = (raw ?? []).map((t: any) => ({
      type: t.type,
      title: t.title ?? t.type,
      fields: (t.fields ?? []).flatMap((f: any) =>
        (f.group ?? []).map((g: any) => ({
          key: g.key,
          name: g.name ?? f.name ?? g.key,
          type: g.type,
          required: !!g.required,
          refresh: !!g.refreshRequirementsOnChange,
          example: g.example || undefined,
          options: Array.isArray(g.valuesAllowed) ? g.valuesAllowed.map((v: any) => ({ key: v.key, name: v.name })) : undefined,
        })),
      ),
    }));
    return { mode, types };
  });

export const saveBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        currency: z.string().regex(/^[A-Z]{3}$/),
        type: z.string().min(1).max(60),
        holderName: z.string().trim().min(2).max(120),
        details: z.record(z.string(), z.string().max(200)),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isRecruiterId(context.userId))) throw new Error("NOT_AUTHORIZED");
    const { admin, getActiveMode, getConnection, wiseFetch, nestDetails, last4Of } = await import("@/lib/wise.server");
    const { mode } = await getActiveMode();
    const { token, profileId } = await getConnection(mode);
    let rec: any;
    try {
      rec = await wiseFetch(mode, token, "/v1/accounts", {
        method: "POST",
        body: {
          currency: data.currency,
          type: data.type,
          profile: profileId,
          accountHolderName: data.holderName,
          ownedByCustomer: false,
          details: nestDetails(data.details),
        },
      });
    } catch (e) {
      throw new Error(e instanceof Error ? `Wise couldn't accept these details: ${e.message}` : "Wise rejected these details.");
    }
    const country =
      data.details["address.country"] || data.details["country"] || rec?.country || null;
    const bankName = rec?.details?.bankName || data.details["bankName"] || null;
    const db = await admin();
    const { error } = await db.from("recruiter_bank_accounts").upsert(
      {
        recruiter_id: context.userId,
        mode,
        wise_recipient_id: rec.id,
        holder_name: data.holderName,
        bank_name: bankName,
        last4: last4Of(data.details),
        currency: data.currency,
        country,
      },
      { onConflict: "recruiter_id,mode" },
    );
    if (error) throw new Error("Saved with Wise but couldn't save the summary. Try again.");
    return { ok: true };
  });

/* ---------------- Summary (owed, bank, history) ---------------- */

export type BankSummary = { holderName: string; bankName: string | null; last4: string | null; currency: string; country: string | null };
export type PayoutItem = {
  id: string;
  amountCents: number;
  currency: string;
  targetAmount: number | null;
  targetCurrency: string | null;
  status: string;
  createdAt: string;
  error: string | null;
};
export type PayoutSummary = {
  recruiterId: string;
  earnedCents: number;
  paidCents: number;
  inFlightCents: number;
  owedCents: number;
  bank: BankSummary | null;
  history: PayoutItem[];
};

export const getPayoutSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await rolesOf(context.userId);
    if (!r.isFounder && !r.isRecruiter) throw new Error("NOT_AUTHORIZED");
    const { admin, getActiveMode, refreshPayout } = await import("@/lib/wise.server");
    const db = await admin();
    const { mode, sandboxVerified } = await getActiveMode();

    let ids: string[];
    if (r.isFounder) {
      const { data } = await db.from("user_roles").select("user_id").eq("role", "recruiter");
      ids = [...new Set(((data ?? []) as { user_id: string }[]).map((x) => x.user_id))];
    } else ids = [context.userId];

    const { data: conn } = await db.from("wise_connection").select("mode").eq("mode", mode).maybeSingle();
    if (ids.length === 0) return { mode, sandboxVerified, connected: !!conn, isFounder: r.isFounder, rows: [] as PayoutSummary[] };

    const [{ data: lands }, { data: pays }, { data: banks }] = await Promise.all([
      db.from("recruiter_lands").select("recruiter_id, delta, month").in("recruiter_id", ids),
      db.from("recruiter_payouts").select("*").in("recruiter_id", ids).eq("mode", mode).order("created_at", { ascending: false }),
      db.from("recruiter_bank_accounts").select("*").in("recruiter_id", ids).eq("mode", mode),
    ]);

    // Reconcile a few in-flight payouts with Wise (source of truth).
    const open = ((pays ?? []) as any[]).filter((p) => p.wise_transfer_id && ["processing", "awaiting_funding", "pending"].includes(p.status)).slice(0, 5);
    for (const p of open) {
      try {
        p.status = await refreshPayout(p);
      } catch {
        /* keep last known status */
      }
    }

    const rows: PayoutSummary[] = ids.map((id) => {
      const myLands = ((lands ?? []) as any[]).filter((l) => l.recruiter_id === id);
      const byMonth = new Map<string, number>();
      for (const l of myLands) byMonth.set(l.month, (byMonth.get(l.month) ?? 0) + l.delta);
      let bonusCents = 0;
      for (const total of byMonth.values()) bonusCents += Math.floor(Math.max(0, total) / BONUS_PER) * BONUS_AMOUNT * 100;
      const earnedCents = myLands.reduce((s, l) => s + l.delta, 0) * LAND_RATE * 100 + bonusCents;
      const mine = ((pays ?? []) as any[]).filter((p) => p.recruiter_id === id);
      const paidCents = mine.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount_cents, 0);
      const inFlightCents = mine.filter((p) => !["completed", "failed", "cancelled"].includes(p.status)).reduce((s, p) => s + p.amount_cents, 0);
      const b = ((banks ?? []) as any[]).find((x) => x.recruiter_id === id);
      return {
        recruiterId: id,
        earnedCents,
        paidCents,
        inFlightCents,
        owedCents: Math.max(0, earnedCents - paidCents - inFlightCents),
        bank: b ? { holderName: b.holder_name, bankName: b.bank_name, last4: b.last4, currency: b.currency, country: b.country } : null,
        history: mine.map((p) => ({
          id: p.id,
          amountCents: p.amount_cents,
          currency: p.currency,
          targetAmount: p.target_amount != null ? Number(p.target_amount) : null,
          targetCurrency: p.target_currency,
          status: p.status,
          createdAt: p.created_at,
          error: p.error,
        })),
      };
    });
    return { mode, sandboxVerified, connected: !!conn, isFounder: r.isFounder, rows };
  });

/* ---------------- Founder: quote + confirm ---------------- */

const payInput = z.object({ recruiterId: z.string().uuid(), amountCents: z.number().int().min(100).max(10_000_000) });

async function recipientFor(recruiterId: string, mode: string) {
  const { admin } = await import("@/lib/wise.server");
  const { data } = await (await admin()).from("recruiter_bank_accounts").select("*").eq("recruiter_id", recruiterId).eq("mode", mode).maybeSingle();
  if (!data) throw new Error("This recruiter hasn't added a bank account yet.");
  return data as any;
}

export const quotePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => payInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context.userId);
    if (!(await isRecruiterId(data.recruiterId))) throw new Error("That account is not a recruiter.");
    const { getActiveMode, getConnection, wiseFetch } = await import("@/lib/wise.server");
    const { mode } = await getActiveMode();
    const bank = await recipientFor(data.recruiterId, mode);
    const { token, profileId } = await getConnection(mode);
    const q = await wiseFetch(mode, token, `/v3/profiles/${profileId}/quotes`, {
      method: "POST",
      body: { sourceCurrency: "USD", targetCurrency: bank.currency, sourceAmount: data.amountCents / 100, targetAccount: Number(bank.wise_recipient_id) },
    });
    const opt =
      (q.paymentOptions ?? []).find((o: any) => o.payIn === "BALANCE" && !o.disabled) ?? (q.paymentOptions ?? [])[0] ?? {};
    return {
      mode,
      quoteId: String(q.id),
      expiresAt: q.expirationTime ?? null,
      rate: q.rate ?? null,
      fee: opt.fee?.total ?? null,
      sourceAmount: opt.sourceAmount ?? data.amountCents / 100,
      targetAmount: opt.targetAmount ?? q.targetAmount ?? null,
      targetCurrency: bank.currency as string,
      bank: { holderName: bank.holder_name, bankName: bank.bank_name, last4: bank.last4, currency: bank.currency },
    };
  });

export const confirmPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => payInput.extend({ quoteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context.userId);
    if (!(await isRecruiterId(data.recruiterId))) throw new Error("That account is not a recruiter.");
    const { admin, getActiveMode, getConnection, wiseFetch, mapStatus, WiseError } = await import("@/lib/wise.server");
    const db = await admin();
    const { mode } = await getActiveMode();
    const bank = await recipientFor(data.recruiterId, mode);
    const { token, profileId } = await getConnection(mode);

    // Re-check the quote matches what was confirmed.
    const q = await wiseFetch(mode, token, `/v3/profiles/${profileId}/quotes/${data.quoteId}`);
    if (Math.round(Number(q.sourceAmount) * 100) !== data.amountCents || q.targetCurrency !== bank.currency)
      throw new Error("The quote no longer matches. Refresh the quote and try again.");
    if (q.expirationTime && new Date(q.expirationTime).getTime() < Date.now())
      throw new Error("The quote expired. Refresh it and try again.");

    const { data: payoutId, error: rErr } = await db.rpc("reserve_recruiter_payout", {
      p_recruiter: data.recruiterId,
      p_mode: mode,
      p_amount_cents: data.amountCents,
      p_rate_cents: LAND_RATE * 100,
      p_bonus_per: BONUS_PER,
      p_bonus_cents: BONUS_AMOUNT * 100,
      p_created_by: context.userId,
    });
    if (rErr) throw new Error(rErr.message.includes("owed") ? "That's more than this recruiter is owed." : "Couldn't reserve the payout.");

    const { data: row } = await db.from("recruiter_payouts").select("customer_transaction_id").eq("id", payoutId).single();
    const opt = (q.paymentOptions ?? []).find((o: any) => o.payIn === "BALANCE") ?? {};
    await db
      .from("recruiter_payouts")
      .update({ quote_id: data.quoteId, target_currency: bank.currency, target_amount: opt.targetAmount ?? q.targetAmount ?? null, fee: opt.fee?.total ?? null, rate: q.rate ?? null })
      .eq("id", payoutId);

    let transfer: any;
    try {
      transfer = await wiseFetch(mode, token, "/v1/transfers", {
        method: "POST",
        body: {
          targetAccount: Number(bank.wise_recipient_id),
          quoteUuid: data.quoteId,
          customerTransactionId: row.customer_transaction_id,
          details: { reference: "SHLM payout" },
        },
      });
    } catch (e) {
      await db.from("recruiter_payouts").update({ status: "failed", error: e instanceof Error ? e.message : "Transfer failed" }).eq("id", payoutId);
      throw new Error(`Wise didn't create the transfer: ${e instanceof Error ? e.message : "unknown error"}`);
    }
    await db.from("recruiter_payouts").update({ wise_transfer_id: transfer.id, wise_status: transfer.status, status: "processing" }).eq("id", payoutId);

    try {
      const pay = await wiseFetch(mode, token, `/v3/profiles/${profileId}/transfers/${transfer.id}/payments`, {
        method: "POST",
        body: { type: "BALANCE" },
      });
      if (pay?.status === "REJECTED") {
        const msg = pay.errorCode === "transfer.insufficient_funds" ? "Not enough money in your Wise balance." : `Wise rejected funding (${pay.errorCode ?? "unknown"}).`;
        await wiseFetch(mode, token, `/v1/transfers/${transfer.id}/cancel`, { method: "PUT" }).catch(() => null);
        await db.from("recruiter_payouts").update({ status: "failed", error: msg }).eq("id", payoutId);
        throw new Error(msg);
      }
      return { ok: true, status: mapStatus(transfer.status) === "awaiting_funding" ? "processing" : mapStatus(transfer.status) };
    } catch (e) {
      if (e instanceof WiseError && (e.status === 403 || e.status === 401)) {
        // Wise requires approval in its own app for this account (SCA).
        await db.from("recruiter_payouts").update({ status: "awaiting_funding", error: "Approve this transfer in the Wise app to send it." }).eq("id", payoutId);
        return { ok: true, status: "awaiting_funding" };
      }
      throw e;
    }
  });

/** Sandbox only: push a test transfer through Wise's simulated states to completion. */
export const simulateSandboxPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ payoutId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireFounder(context.userId);
    const { admin, getConnection, wiseFetch, refreshPayout } = await import("@/lib/wise.server");
    const db = await admin();
    const { data: p } = await db.from("recruiter_payouts").select("*").eq("id", data.payoutId).maybeSingle();
    if (!p || p.mode !== "sandbox" || !p.wise_transfer_id) throw new Error("Only sandbox transfers can be simulated.");
    const { token } = await getConnection("sandbox");
    for (const step of ["processing", "funds_converted", "outgoing_payment_sent"]) {
      await wiseFetch("sandbox", token, `/v1/simulation/transfers/${p.wise_transfer_id}/${step}`).catch(() => null);
    }
    return { status: await refreshPayout(p) };
  });
