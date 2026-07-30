import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/email-test")({
  server: {
    handlers: {
      POST: async () => {
        const { sendTestEmails } = await import("@/lib/email-test.functions");
        try {
          const result = await sendTestEmails();
          return Response.json(result);
        } catch (e: any) {
          return Response.json({ error: e?.message, code: e?.code }, { status: 500 });
        }
      },
    },
  },
});
