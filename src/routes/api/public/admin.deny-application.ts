import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminPreflight, runAdminAction } from "@/lib/admin-api";

const schema = z.object({
  passcode: z.string().min(1),
  applicationId: z.string().uuid(),
});

export const Route = createFileRoute("/api/public/admin/deny-application")({
  server: {
    handlers: {
      OPTIONS: adminPreflight,
      POST: async ({ request }) =>
        runAdminAction(
          request,
          (raw) => schema.parse(raw),
          async (input) => {
            const { denyApplicationImpl } = await import("@/lib/admin-actions.server");
            return denyApplicationImpl(input.applicationId);
          },
        ),
    },
  },
});
