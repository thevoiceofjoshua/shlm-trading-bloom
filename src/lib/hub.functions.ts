import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DATA_STATE,
  INDEX_QUOTES,
  MAG_SEVEN,
  DOW_DRIVERS,
  DOW_MACRO,
  GOLD_QUOTE,
  GOLD_DRIVERS,
  ECON_EVENTS,
  SESSIONS,
  magSevenBreadth,
  dowMovers,
} from "@/lib/market-data";
import { sessionStatuses } from "@/lib/hub-session";

export interface HubAccess {
  hasAccess: boolean;
  isAdmin: boolean;
  reason?: string;
}

export interface HubPayload {
  access: HubAccess;
  dataState: typeof DATA_STATE;
  sessions: ReturnType<typeof sessionStatuses>;
  indexes: typeof INDEX_QUOTES;
  magSeven: typeof MAG_SEVEN;
  magBreadth: ReturnType<typeof magSevenBreadth>;
  dowDrivers: typeof DOW_DRIVERS;
  dowMacro: typeof DOW_MACRO;
  dowMovers: ReturnType<typeof dowMovers>;
  gold: typeof GOLD_QUOTE;
  goldDrivers: typeof GOLD_DRIVERS;
  econEvents: typeof ECON_EVENTS;
}

async function checkAccess(context: any): Promise<HubAccess> {
  // Admin check via user_roles
  const { data: roleRow } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (roleRow?.role === "admin") return { hasAccess: true, isAdmin: true };

  // Paid membership check
  const email = (context.claims.email as string | undefined) ?? null;
  let query = context.supabase
    .from("purchases")
    .select("id, tier, status, created_at")
    .eq("status", "paid")
    .order("created_at", { ascending: true });
  if (email) query = query.or(`user_id.eq.${context.userId},email.eq.${email}`);
  const { data } = await query;
  const rows = data ?? [];
  if (rows.length === 0) {
    return { hasAccess: false, isAdmin: false, reason: "no-membership" };
  }
  return { hasAccess: true, isAdmin: false };
}

export const getHubData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await checkAccess(context);
    const now = new Date();

    const payload: HubPayload = {
      access,
      dataState: DATA_STATE,
      sessions: sessionStatuses(now),
      indexes: INDEX_QUOTES,
      magSeven: MAG_SEVEN,
      magBreadth: magSevenBreadth(),
      dowDrivers: DOW_DRIVERS,
      dowMacro: DOW_MACRO,
      dowMovers: dowMovers(),
      gold: GOLD_QUOTE,
      goldDrivers: GOLD_DRIVERS,
      econEvents: ECON_EVENTS,
    };

    return payload;
  });

/* ----------------------- Bias journal (member notes) ----------------------- */

const noteSchema = {
  noteDate: (v: unknown) => (typeof v === "string" ? v : ""),
  session: (v: unknown) => (typeof v === "string" ? v : ""),
  body: (v: unknown) => (typeof v === "string" ? v : ""),
};

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

/* ----------------------- SHLM Analyst (AI session review) ------------------ */

export interface SessionReview {
  sessions: { window: string; pairs: string; review: string; levels: string; releases: string }[];
  zeroVolumePair: { pair: string; reason: string };
  highVolumePair: { pair: string; reason: string };
  generatedAt: string;
  dataState: typeof DATA_STATE;
}

const REVIEW_PROMPT = `You are the SHLM trading desk analyst. Given the current hub snapshot, write a concise, plain-English review.

Rules:
- Output ONLY valid JSON matching the schema.
- For each trading window, name the pairs in play, what the current data implies, key levels to watch, and any high-impact release landing inside that window.
- zeroVolumePair: the pair most likely to open with effectively zero volume at its session open, with a one-line reason tied to the data.
- highVolumePair: the pair likely to see the heaviest volume today, with a one-line reason tied to the data (e.g. "CPI at 5:30am PST lands before NY Open").
- Be specific and reference the actual data provided. No filler.`;

export const runSessionReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await checkAccess(context);
    if (!access.hasAccess && !access.isAdmin) {
      throw new Error("No access to SHLM Analyst");
    }

    const now = new Date();
    const snapshot = {
      sessions: sessionStatuses(now),
      indexes: INDEX_QUOTES,
      magSeven: MAG_SEVEN,
      magBreadth: magSevenBreadth(),
      dowDrivers: DOW_DRIVERS,
      dowMacro: DOW_MACRO,
      dowMovers: dowMovers(),
      gold: GOLD_QUOTE,
      goldDrivers: GOLD_DRIVERS,
      econEvents: ECON_EVENTS,
      dataState: DATA_STATE,
    };

    // Try to return a cached review for today first
    const today = now.toISOString().slice(0, 10);
    const { data: cached } = await context.supabase
      .from("session_reviews")
      .select("payload")
      .eq("user_id", context.userId)
      .eq("review_date", today)
      .maybeSingle();
    if (cached?.payload) {
      return cached.payload as SessionReview;
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: REVIEW_PROMPT },
          { role: "user", content: JSON.stringify(snapshot) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "session_review",
            strict: true,
            schema: {
              type: "object",
              properties: {
                sessions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      window: { type: "string" },
                      pairs: { type: "string" },
                      review: { type: "string" },
                      levels: { type: "string" },
                      releases: { type: "string" },
                    },
                    required: ["window", "pairs", "review", "levels", "releases"],
                    additionalProperties: false,
                  },
                },
                zeroVolumePair: {
                  type: "object",
                  properties: {
                    pair: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["pair", "reason"],
                  additionalProperties: false,
                },
                highVolumePair: {
                  type: "object",
                  properties: {
                    pair: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["pair", "reason"],
                  additionalProperties: false,
                },
              },
              required: ["sessions", "zeroVolumePair", "highVolumePair"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      let message = `Analyst request failed [${res.status}]`;
      if (res.status === 402 || res.status === 403) {
        message = "SHLM Analyst is temporarily unavailable. Please try again later.";
      } else if (res.status === 429) {
        message = "Analyst rate limit reached — please wait a moment and try again.";
      }
      console.error("[SHLM Analyst]", res.status, body);
      throw new Error(message);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    let parsed: SessionReview;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Analyst returned an unexpected response. Please try again.");
    }

    parsed.generatedAt = now.toISOString();
    parsed.dataState = DATA_STATE;

    // Cache for today
    await context.supabase
      .from("session_reviews")
      .upsert(
        {
          user_id: context.userId,
          review_date: today,
          payload: parsed,
        },
        { onConflict: "user_id,review_date" },
      );

    return parsed;
  });
