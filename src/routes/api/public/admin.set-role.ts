import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminPreflight, runAdminAction } from "@/lib/admin-api";

const schema = z.object({
  passcode: z.string().min(1),
  userId: z.string().uuid(),
  role: z.enum(["admin", "shlm_mod", "free_member", "member", "revoked"]),
});

export const Route = createFileRoute("/api/public/admin/set-role")({
  server: {
    handlers: {
      OPTIONS: adminPreflight,
      POST: async ({ request }) =>
        runAdminAction(
          request,
          (raw) => schema.parse(raw),
          async (input) => {
            const { setUserRoleImpl } = await import("@/lib/admin-actions.server");
            return setUserRoleImpl(input.userId, input.role);
          },
        ),
    },
  },
});
