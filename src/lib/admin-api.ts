// Shared helpers for the public admin API routes.

export const adminCorsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-max-age": "86400",
};

export const adminJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...adminCorsHeaders, "content-type": "application/json", "cache-control": "no-store" },
  });

export const adminPreflight = async () => new Response(null, { status: 204, headers: adminCorsHeaders });

/** Runs a passcode-gated admin action, mapping a bad passcode to 401. */
export async function runAdminAction<T>(
  request: Request,
  parse: (raw: unknown) => { passcode: string } & T,
  run: (input: { passcode: string } & T) => Promise<unknown>,
) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return adminJson({ error: "Invalid JSON body." }, 400);
  }

  let input: { passcode: string } & T;
  try {
    input = parse(raw);
  } catch {
    return adminJson({ error: "Invalid request." }, 400);
  }

  const { verifyPasscode } = await import("@/lib/admin-actions.server");
  try {
    verifyPasscode(input.passcode);
  } catch {
    return adminJson({ error: "Invalid passcode" }, 401);
  }

  try {
    return adminJson(await run(input));
  } catch (err) {
    console.error("Admin action failed", err);
    return adminJson({ error: err instanceof Error ? err.message : "Action failed." }, 500);
  }
}
