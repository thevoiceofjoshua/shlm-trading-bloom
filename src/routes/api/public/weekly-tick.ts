import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const digest = (v: string) => createHash("sha256").update(v).digest();

// Called every 5 minutes by an external scheduler; protected by WEEKLY_TICK_SECRET.
async function handle(request: Request) {
  const secret = process.env["WEEKLY_TICK_SECRET"];
  const url = new URL(request.url);
  const given = request.headers.get("x-tick-secret") ?? url.searchParams.get("key") ?? "";
  if (!secret || !timingSafeEqual(digest(given), digest(secret))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const day = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  // Seasonality daily job: after the US close (2:00–2:15 PM PT, Mon–Fri) add the new day for NQ and YM.
  let seasonality: unknown = undefined;
  if (day !== "Sat" && day !== "Sun" && hour === 14 && minute < 15) {
    const { syncSeasonality } = await import("@/lib/seasonality-sync.server");
    seasonality = await syncSeasonality({ years: 0.1 }).catch((e) => { console.error("Seasonality daily sync failed", e); return "failed"; });
  }
  if (day === "Sat" || (day === "Sun" && hour < 15) || (day === "Fri" && hour >= 14)) {
    return Response.json({ ok: true, skipped: "outside session window", seasonality });
  }
  const { recordWeeklyActivity } = await import("@/lib/weekly-activity.server");
  const r = await recordWeeklyActivity();
  return Response.json({ ok: true, sessionDate: r.sessionDate, lastBarTs: r.lastBarTs, seasonality });
}

export const Route = createFileRoute("/api/public/weekly-tick")({
  server: { handlers: { GET: ({ request }) => handle(request), POST: ({ request }) => handle(request) } },
});
