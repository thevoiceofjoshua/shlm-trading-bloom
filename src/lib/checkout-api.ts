// Shared helpers for the public checkout API routes.

export const checkoutCorsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-max-age": "86400",
};

export const checkoutJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...checkoutCorsHeaders,
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

export const checkoutPreflight = async () =>
  new Response(null, { status: 204, headers: checkoutCorsHeaders });

export async function runCheckoutAction<T>(
  request: Request,
  parse: (raw: unknown) => T,
  run: (input: T) => Promise<unknown>,
) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return checkoutJson({ error: "Invalid JSON body." }, 400);
  }

  let input: T;
  try {
    input = parse(raw);
  } catch {
    return checkoutJson({ error: "Invalid request." }, 400);
  }

  try {
    return checkoutJson(await run(input));
  } catch (err) {
    console.error("Checkout action failed", err);
    return checkoutJson({ error: err instanceof Error ? err.message : "Checkout failed." }, 500);
  }
}
