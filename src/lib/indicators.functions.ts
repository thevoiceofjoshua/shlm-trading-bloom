import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkAccess } from "@/lib/hub.functions";
import { canManageIndicators, indicatorInput, requestInput } from "@/lib/indicator-rules";
import type { Database } from "@/integrations/supabase/types";

export type Indicator = Database["public"]["Tables"]["indicators"]["Row"];
export type IndicatorRequest = Database["public"]["Tables"]["indicator_requests"]["Row"];

async function owner(context: { userId: string; supabase: any }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !canManageIndicators(context.userId, data === true)) throw new Error("Not authorized.");
}

export const getIndicatorWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await checkAccess(context);
    if (!access.hasAccess) throw new Error("Centre membership required.");
    const isOwner = canManageIndicators(context.userId, access.isAdmin);
    const [catalogue, requests] = await Promise.all([
      context.supabase.from("indicators").select("*").order("display_order").order("id"),
      context.supabase.from("indicator_requests").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100),
    ]);
    if (catalogue.error || requests.error) throw new Error("Could not load indicator requests. Try again.");
    return { isOwner, indicators: catalogue.data ?? [], requests: requests.data ?? [] };
  });

export const submitIndicatorRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => requestInput.parse(value))
  .handler(async ({ context, data }) => {
    const access = await checkAccess(context);
    if (!access.hasAccess) throw new Error("Centre membership required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: saved, error } = await supabaseAdmin.rpc("submit_indicator_request", {
      p_user: context.userId, p_indicator: data.indicatorId, p_username: data.username,
      p_note: data.note, p_submission: data.submissionId,
    });
    if (error || !saved) {
      console.error("Indicator request persistence failed", { userId: context.userId, submissionId: data.submissionId, code: error?.code });
      throw new Error("Request not confirmed. Retry with the same details.");
    }
    const request = (Array.isArray(saved) ? saved[0] : saved) as IndicatorRequest | undefined;
    if (!request) throw new Error("Request not confirmed. Please retry.");
    // Persistence is independent from email. A stable key makes an uncertain
    // provider response retry-safe. A pending request never depends on delivery.
    if (request.notification_status !== "sent") {
      let notificationStatus: "sent" | "failed" = "failed";
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const result = await sendTemplateEmail("beta-username", request.member_email, {
          idempotencyKey: `indicator-request-${request.id}`,
          replyTo: request.member_email || undefined,
          templateData: { username: request.tradingview_username, memberEmail: request.member_email, note: request.note, indicatorName: request.indicator_name, requestId: request.id },
        });
        notificationStatus = result.sent ? "sent" : "failed";
      } catch (error) {
        console.warn("Indicator request saved; notification failed", { requestId: request.id, reason: error instanceof Error ? error.message : "Email error" });
      }
      const { error: notificationError } = await supabaseAdmin.from("indicator_requests").update({ notification_status: notificationStatus }).eq("id", request.id).neq("notification_status", "sent");
      if (!notificationError) request.notification_status = notificationStatus;
    }
    return { saved: true as const, request };
  });

export const saveIndicator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => indicatorInput.parse(value))
  .handler(async ({ context, data }) => {
    await owner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The generated RPC type cannot express SQL NULL for an optional UUID.
    const args = { p_actor: context.userId, p_id: data.id ?? null, p_name: data.name, p_description: data.description, p_active: data.active };
    const { data: row, error } = await supabaseAdmin.rpc("manage_indicator", args as unknown as Database["public"]["Functions"]["manage_indicator"]["Args"]);
    if (error) throw new Error(error.code === "23505" ? "An indicator with that name already exists." : "Indicator not saved. Please retry.");
    return row;
  });

export const reorderIndicatorCatalogue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ ids: z.array(z.string().uuid()).max(1000) }).parse(value))
  .handler(async ({ context, data }) => {
    await owner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("reorder_indicators", { p_actor: context.userId, p_ids: data.ids });
    if (error) throw new Error("Order not saved. Reload and try again.");
    return { saved: true };
  });

export const getIndicatorAdministration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ page: z.number().int().min(0).default(0) }).parse(value ?? {}))
  .handler(async ({ context, data }) => {
    await owner(context);
    const [catalogue, requests, pending] = await Promise.all([
      context.supabase.from("indicators").select("*").order("display_order").order("id"),
      context.supabase.from("indicator_requests").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(data.page * 25, data.page * 25 + 24),
      context.supabase.from("indicator_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    if (catalogue.error || requests.error || pending.error) throw new Error("Could not load indicator administration.");
    return { indicators: catalogue.data ?? [], requests: requests.data ?? [], total: requests.count ?? 0, pending: pending.count ?? 0 };
  });

export const reviewIndicatorRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]) }).parse(value))
  .handler(async ({ context, data }) => {
    await owner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: request, error } = await supabaseAdmin.rpc("review_indicator_request", { p_actor: context.userId, p_id: data.id, p_status: data.status });
    if (error) throw new Error("Decision not saved. Reload and try again.");
    return request;
  });