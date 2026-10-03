import { createFileRoute } from "@tanstack/react-router";

/**
 * Wise transfer status webhook. The payload is never trusted: it only tells us
 * which transfer changed, and we re-read that transfer from Wise with our own
 * token before updating the ledger. Unknown transfers are ignored.
 */
export const Route = createFileRoute("/api/public/wise-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let id: number | null = null;
        try {
          const body = await request.json();
          const raw = body?.data?.resource?.id;
          id = Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
        } catch {
          return new Response("ok");
        }
        if (!id) return new Response("ok");
        try {
          const { admin, refreshPayout } = await import("@/lib/wise.server");
          const db = await admin();
          const { data } = await db
            .from("recruiter_payouts")
            .select("id, mode, wise_transfer_id, status")
            .eq("wise_transfer_id", id)
            .maybeSingle();
          if (data) await refreshPayout(data);
        } catch (e) {
          console.error("wise webhook refresh failed");
        }
        return new Response("ok");
      },
    },
  },
});
