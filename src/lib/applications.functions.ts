import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const scheduledIso = new Date(data.scheduledAt).toISOString();

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

    if (error) throw new Error(error.message);

    // Fire notification email to admin (fixed recipient via env)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const prettyDate = new Date(scheduledIso).toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: data.timezone || "America/Los_Angeles",
        });
        await sendTemplateEmail("application-notification", adminEmail, {
          idempotencyKey: `application-notification-${row.id}`,
          replyTo: data.email,
          templateData: {
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            tier: data.tier,
            experience: data.experience,
            goals: data.goals,
            scheduledAt: prettyDate,
            timezone: data.timezone,
          },
        });
      } catch (err) {
        console.error("Failed to send application notification email", err);
      }
    }

    return { id: row.id };
  });
