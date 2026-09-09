import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DATA_STATE,
  INDEX_QUOTES,
  MAG_SEVEN,
  DOW_DRIVERS,
  DOW_MACRO,
  NASDAQ_MACRO,
  GOLD_QUOTE,
  GOLD_DRIVERS,
  ECON_EVENTS,
  SESSIONS,
  magSevenBreadth,
  dowMovers,
  nasdaqMovers,
} from "@/lib/market-data";
import type { LevelQuote } from "@/lib/market-data";
import { sessionStatuses } from "@/lib/hub-session";

export interface HubAccess {
  hasAccess: boolean;
  isAdmin: boolean;
  /** True when a paid membership grants access (independent of admin role). */
  memberAccess: boolean;
  /** SHLM MOD: Centre access granted, but no program-management rights. */
  readOnly?: boolean;
  reason?: string;
}

export interface HubPayload {
  access: HubAccess;
  dataState: typeof DATA_STATE | "delayed";
  /** ISO timestamp of the last successful feed refresh (delayed feed only). */
  fetchedAt?: string;
  sessions: ReturnType<typeof sessionStatuses>;
  indexes: typeof INDEX_QUOTES;
  magSeven: typeof MAG_SEVEN;
  magBreadth: ReturnType<typeof magSevenBreadth>;
  nasdaqMacro: typeof NASDAQ_MACRO;
  nasdaqMovers: ReturnType<typeof nasdaqMovers>;
  dowDrivers: typeof DOW_DRIVERS;
  dowMacro: typeof DOW_MACRO;
  dowMovers: ReturnType<typeof dowMovers>;
  gold: typeof GOLD_QUOTE;
  goldDrivers: typeof GOLD_DRIVERS;
  econEvents: typeof ECON_EVENTS;
  /** True when the calendar rows come from the live economic feed. */
  econLive?: boolean;
}

async function checkAccess(context: any): Promise<HubAccess> {
  // Role check via user_roles: `admin` = full store, `shlm_mod` = Centre only.
  const { data: roleRows } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const held = ((roleRows ?? []) as { role: string }[]).map((r) => r.role);
  const isAdmin = held.includes("admin");
  const isMod = held.includes("shlm_mod");

  // Paid membership check
  const email = (context.claims.email as string | undefined) ?? null;
  let query = context.supabase
    .from("purchases")
    .select("id, tier, status, created_at")
    .eq("status", "paid")
    .order("created_at", { ascending: true });
  if (email) query = query.or(`user_id.eq.${context.userId},email.eq.${email}`);
  const { data } = await query;
  const memberAccess = (data ?? []).length > 0;

  if (isAdmin) return { hasAccess: true, isAdmin: true, memberAccess };
  if (isMod) return { hasAccess: true, isAdmin: false, memberAccess, readOnly: true };
  if (!memberAccess) {
    return { hasAccess: false, isAdmin: false, memberAccess: false, reason: "no-membership" };
  }
  return { hasAccess: true, isAdmin: false, memberAccess: true };
}

/** Overlay delayed feed prices onto the typed sample payload, in place. */
function applyDelayedQuotes(
  payload: HubPayload,
  quotes: Record<
    string,
    {
      price: number;
      change: number;
      changePct: number;
      dayHigh: number;
      dayLow: number;
      previousClose: number;
      priorDayHigh?: number;
      priorDayLow?: number;
      premarketHigh?: number;
      premarketLow?: number;
      h1?: LevelQuote["h1"];
      pullbacks?: LevelQuote["pullbacks"];
      levelsSetAt?: string;
    }
  >,
) {
  payload.indexes = payload.indexes.map((idx) => {
    const q = quotes[idx.symbol];
    if (!q) return idx;
    // Key levels only carry real feed values — never a duplicated close or
    // today's intraday range standing in for yesterday / pre-market.
    return {
      ...idx,
      price: q.price,
      change: q.change,
      changePct: q.changePct,
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      priorDayHigh: q.priorDayHigh,
      priorDayLow: q.priorDayLow,
      premarketHigh: q.premarketHigh,
      premarketLow: q.premarketLow,
      h1: q.h1,
      pullbacks: q.pullbacks,
      levelsSetAt: q.levelsSetAt,
    };
  });

  payload.magSeven = payload.magSeven.map((s) => {
    const q = quotes[s.symbol];
    return q ? { ...s, price: q.price, change: q.change, changePct: q.changePct, dayHigh: q.dayHigh, dayLow: q.dayLow } : s;
  });
  payload.dowDrivers = payload.dowDrivers.map((d) => {
    const q = quotes[d.symbol];
    return q ? { ...d, price: q.price, changePct: q.changePct } : d;
  });

  const g = quotes["XAU/USD"];
  if (g) {
    payload.gold = {
      ...payload.gold,
      price: g.price,
      change: g.change,
      changePct: g.changePct,
      dayHigh: g.dayHigh,
      dayLow: g.dayLow,
      h1: g.h1,
      pullbacks: g.pullbacks,
      levelsSetAt: g.levelsSetAt,
    };
  }

  // Macro tiles: 10-year yield, dollar index, crude.
  const macroValue = (label: string): { value: string; direction: "up" | "down" | "flat" } | null => {
    if (label.includes("10-Year")) {
      const q = quotes["TNX"];
      // ^TNX quotes the yield in index points (e.g. 42.8 = 4.28%).
      return q ? { value: `${(q.price > 20 ? q.price / 10 : q.price).toFixed(2)}%`, direction: q.changePct >= 0 ? "up" : "down" } : null;
    }
    if (label.includes("USD") || label.includes("DXY") || label.includes("Dollar")) {
      const q = quotes["DXY"];
      return q ? { value: q.price.toFixed(1), direction: q.changePct >= 0 ? "up" : "down" } : null;
    }
    if (label.includes("Oil")) {
      const q = quotes["WTI"];
      return q ? { value: `$${q.price.toFixed(2)}`, direction: q.changePct >= 0 ? "up" : "down" } : null;
    }
    return null;
  };
  const patchMacro = <T extends { label: string; value: string; direction: "up" | "down" | "flat" }>(list: T[]): T[] =>
    list.map((m) => {
      const v = macroValue(m.label);
      return v ? { ...m, value: v.value, direction: v.direction } : m;
    });
  payload.nasdaqMacro = patchMacro(payload.nasdaqMacro);
  payload.dowMacro = patchMacro(payload.dowMacro);
  payload.goldDrivers = patchMacro(payload.goldDrivers);

  // Recompute breadth / top-mover copy from the refreshed numbers.
  const green = payload.magSeven.filter((s) => s.changePct >= 0).length;
  const total = payload.magSeven.length;
  payload.magBreadth = {
    green,
    total,
    label: green > total / 2 ? `${green} of ${total} green — index tailwind` : `${total - green} of ${total} red — index headwind`,
  };
  const topMag = [...payload.magSeven].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];
  if (topMag) {
    payload.nasdaqMovers = { top: topMag.symbol, label: `${topMag.name} is driving the index ${topMag.changePct >= 0 ? "higher" : "lower"}` };
  }
  const topDow = [...payload.dowDrivers].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];
  if (topDow) {
    payload.dowMovers = { top: topDow.symbol, label: `${topDow.name} is driving the Dow ${topDow.changePct >= 0 ? "higher" : "lower"}` };
  }

  payload.dataState = "delayed";
  payload.fetchedAt = new Date().toISOString();
}

export const getHubData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as Record<string, unknown>;
    return { asMember: d.asMember === true };
  })
  .handler(async ({ context, data }) => {
    const resolved = await checkAccess(context);
    // "View as member" lets an admin confirm the real member-side gate.
    const access: HubAccess = data.asMember
      ? {
          hasAccess: resolved.memberAccess,
          isAdmin: false,
          memberAccess: resolved.memberAccess,
          ...(resolved.memberAccess ? {} : { reason: "no-membership" }),
        }
      : resolved;
    const now = new Date();

    const payload: HubPayload = {
      access,
      dataState: DATA_STATE,
      sessions: sessionStatuses(now),
      indexes: INDEX_QUOTES,
      magSeven: MAG_SEVEN,
      magBreadth: magSevenBreadth(),
      nasdaqMacro: NASDAQ_MACRO,
      nasdaqMovers: nasdaqMovers(),
      dowDrivers: DOW_DRIVERS,
      dowMacro: DOW_MACRO,
      dowMovers: dowMovers(),
      gold: GOLD_QUOTE,
      goldDrivers: GOLD_DRIVERS,
      econEvents: ECON_EVENTS,
    };

    // Free delayed feed: overlay real prices when reachable, else keep samples.
    if (access.hasAccess) {
      try {
        const { fetchDelayedQuotes } = await import("@/lib/quotes.server");
        const quotes = await fetchDelayedQuotes();
        if (Object.keys(quotes).length > 0) applyDelayedQuotes(payload, quotes);
      } catch {
        // Feed unavailable — sample dataset stays in place.
      }

      // Live economic calendar: real releases when reachable, else samples.
      try {
        const { fetchLiveEconEvents } = await import("@/lib/econ-calendar.server");
        const econ = await fetchLiveEconEvents();
        if (econ.length > 0) {
          payload.econEvents = econ;
          payload.econLive = true;
        }
      } catch {
        // Calendar feed unavailable — sample events stay in place.
      }
    }

    return payload;
  });

/* ----------------------- Bias journal (member notes) ----------------------- */

export const getMemberNotesRange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as Record<string, unknown>;
    const from = typeof d.from === "string" ? d.from : "";
    const to = typeof d.to === "string" ? d.to : "";
    if (!from || !to) throw new Error("from and to are required");
    return { from, to };
  })
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("member_notes")
      .select("note_date, session, body, updated_at")
      .eq("user_id", context.userId)
      .gte("note_date", data.from)
      .lte("note_date", data.to);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteMemberNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as Record<string, unknown>;
    const noteDate = typeof d.noteDate === "string" ? d.noteDate : "";
    const session = typeof d.session === "string" ? d.session : "";
    if (!noteDate || !session) throw new Error("noteDate and session are required");
    return { noteDate, session };
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("member_notes")
      .delete()
      .eq("user_id", context.userId)
      .eq("note_date", data.noteDate)
      .eq("session", data.session);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });

/* --------------------------- Personal rulebook ----------------------------- */

export interface MemberRule {
  id: string;
  text: string;
}

export const getMemberRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: row, error } = await context.supabase
      .from("member_rules")
      .select("rules, consequence")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { configured: false, rules: [] as MemberRule[], consequence: "" };
    const rules = Array.isArray(row.rules) ? (row.rules as unknown as MemberRule[]) : [];
    return { configured: rules.length > 0, rules, consequence: row.consequence ?? "" };
  });

export const saveMemberRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as Record<string, unknown>;
    const rawRules = Array.isArray(d.rules) ? d.rules : [];
    const rules: MemberRule[] = rawRules
      .map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return {
          id: typeof o.id === "string" && o.id ? o.id : crypto.randomUUID(),
          text: typeof o.text === "string" ? o.text.trim() : "",
        };
      })
      .filter((r) => r.text !== "");
    const consequence = typeof d.consequence === "string" ? d.consequence.trim() : "";
    if (rules.length === 0) throw new Error("At least one rule is required");
    if (!consequence) throw new Error("A consequence is required");
    return { rules, consequence };
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("member_rules").upsert(
      {
        user_id: context.userId,
        rules: data.rules as unknown as never,
        consequence: data.consequence,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { saved: true, rules: data.rules, consequence: data.consequence };
  });

export const getMemberNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as Record<string, unknown>;
    return {
      noteDate: typeof d.noteDate === "string" ? d.noteDate : "",
    };
  })
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("member_notes")
      .select("note_date, session, body, updated_at")
      .eq("user_id", context.userId)
      .eq("note_date", data.noteDate);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveMemberNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as Record<string, unknown>;
    const noteDate = typeof d.noteDate === "string" ? d.noteDate : "";
    const session = typeof d.session === "string" ? d.session : "";
    const body = typeof d.body === "string" ? d.body : "";
    if (!noteDate || !session) throw new Error("noteDate and session are required");
    return { noteDate, session, body };
  })
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("member_notes")
      .upsert(
        {
          user_id: context.userId,
          note_date: data.noteDate,
          session: data.session,
          body: data.body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,note_date,session" },
      );
    if (error) throw new Error(error.message);
    return { saved: true };
  });
