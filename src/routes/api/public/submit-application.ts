import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public application submission endpoint.
// Callable cross-origin (the storefront may be hosted outside Lovable) with no auth.

const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-max-age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json", "cache-control": "no-store" },
  });

const inputSchema = z.object({
  tier: z.enum(["foundation", "mentorship", "elite"]),
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  experience: z.string().max(2000).optional().or(z.literal("")),
  goals: z.string().max(2000).optional().or(z.literal("")),
  scheduledAt: z.string().min(1),
  timezone: z.string().max(80).optional().or(z.literal("")),
});

const TIER_LABELS: Record<string, string> = {
  foundation: "Beginner",
  mentorship: "Intermediate",
  elite: "Advanced",
};

export const Route = createFileRoute("/api/public/submit-application")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body." }, 400);
        }

        const parsed = inputSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: parsed.error.issues[0]?.message ?? "Invalid application data." }, 400);
        }
        const data = parsed.data;

        const scheduled = new Date(data.scheduledAt);
        if (Number.isNaN(scheduled.getTime())) {
          return json({ error: "Please choose a valid date and time for your call." }, 400);
        }
        const scheduledIso = scheduled.toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: row, error } = await supabaseAdmin
          .from("applications")
          .insert({
            tier: data.tier,
            full_name: data.fullName,
            email: data.email,
            phone: data.phone || null,
            experience: data.experience || null,
            goals: data.goals || null,
            scheduled_at: scheduledIso,
            timezone: data.timezone || null,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Failed to insert application", error);
          return json({ error: error.message }, 500);
        }

        const applicantTz = data.timezone || "America/Los_Angeles";
        const formatIn = (tz: string) =>
          new Date(scheduledIso).toLocaleString("en-US", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: tz,
          });
        const applicantLocalTime = formatIn(applicantTz);
        const laTime = formatIn("America/Los_Angeles");

        const adminEmail = process.env["ADMIN_NOTIFICATION_EMAIL"];
        if (adminEmail) {
          try {
            const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
            await sendTemplateEmail("application-notification", adminEmail, {
              idempotencyKey: `application-notification-${row.id}`,
              replyTo: data.email,
              templateData: {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                tier: TIER_LABELS[data.tier] ?? data.tier,
                experience: data.experience,
                goals: data.goals,
                scheduledAt: applicantLocalTime,
                scheduledAtLA: laTime,
                timezone: applicantTz,
              },
            });
          } catch (err) {
            console.error("Failed to send application notification email", err);
          }
        }

        return json({
          id: row.id,
          timezone: applicantTz,
          scheduledAtLocal: applicantLocalTime,
          scheduledAtLA: laTime,
        });
      },
    },
  },
});
