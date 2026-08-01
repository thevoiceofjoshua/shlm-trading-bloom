import { createFileRoute } from "@tanstack/react-router";
import { createApplicationCheckout } from "@/lib/enroll.server";

export const Route = createFileRoute("/api/public/enroll/$applicationId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const origin = new URL(request.url).origin;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: app, error } = await supabaseAdmin
            .from("applications")
            .select("id, full_name, email, phone, tier, status")
            .eq("id", params.applicationId)
            .single();

          if (error || !app || app.status !== "approved") {
            return new Response(null, {
              status: 302,
              headers: { Location: `${origin}/#pricing`, "Cache-Control": "no-store" },
            });
          }

          const { session } = await createApplicationCheckout({
            applicationId: app.id,
            email: app.email,
            fullName: app.full_name,
            phone: app.phone,
            tier: app.tier,
            origin,
          });

          return new Response(null, {
            status: 302,
            headers: {
              Location: session.url!,
              "Referrer-Policy": "no-referrer",
              "Cache-Control": "no-store",
            },
          });
        } catch {
          return new Response(null, {
            status: 302,
            headers: { Location: `${origin}/#pricing`, "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
