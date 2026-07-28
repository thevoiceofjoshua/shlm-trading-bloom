import { createFileRoute } from "@tanstack/react-router";
import { DISCORD_INVITE_URL } from "@/lib/external-links";

export const Route = createFileRoute("/discord")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(null, {
          status: 302,
          headers: {
            Location: DISCORD_INVITE_URL,
            "Cross-Origin-Opener-Policy": "unsafe-none",
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});