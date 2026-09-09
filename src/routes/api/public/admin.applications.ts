import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminPreflight, runAdminAction } from "@/lib/admin-api";

const schema = z.object({ passcode: z.string().min(1) });

export const Route = createFileRoute("/api/public/admin/applications")({
  server: {
    handlers: {
      OPTIONS: adminPreflight,
      POST: async ({ request }) =>
        runAdminAction(
          request,
          (raw) => schema.parse(raw),
          async () => {
            const { listApplicationsImpl } = await import("@/lib/admin-actions.server");
            return listApplicationsImpl();
          },
        ),
    },
  },
});
