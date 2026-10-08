import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

// Public: returns only recruiter id + display name for the application form dropdown.
export const Route = createFileRoute("/api/public/recruiters-list")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { listReferrers } = await import("@/lib/referrers.server");
          const list = await listReferrers(supabaseAdmin);
          return new Response(JSON.stringify(list), {
            headers: { ...cors, "content-type": "application/json", "cache-control": "public, max-age=60" },
          });
        } catch (e) {
          console.error("recruiters-list failed", e);
          return new Response("[]", { status: 500, headers: { ...cors, "content-type": "application/json" } });
        }
      },
    },
  },
});
