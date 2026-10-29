import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { NoObjectGeneratedError, Output, APICallError } from "ai";
import { createParser } from "eventsource-parser";
import { z } from "zod";
import { checkAccess } from "@/lib/hub.functions";
import { normalizeVoiceDraft, VOICE_MAX_BYTES } from "@/lib/journal-voice";

const schema = z.object({ bias: z.string().nullable(), levels: z.string().nullable(), wentWell: z.string().nullable(), wentWrong: z.string().nullable(), emotion: z.string().nullable(), outcome: z.string().nullable(), rule: z.string().nullable(), notes: z.string().nullable(), pnl: z.string().nullable() });
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function upstreamError(response: Response) {
  const text = await response.text().catch(() => "");
  let message = "Voice processing failed. Try again.";
  try { const parsed = JSON.parse(text); message = parsed?.error?.message || parsed?.message || message; } catch { /* safe fallback */ }
  return { status: response.status, message: message.slice(0, 300) };
}
async function boundedForm(request: Request) {
  if (!request.body) throw new Error("Empty recording");
  const chunks: Uint8Array[] = [], reader = request.body.getReader();
  let bytes = 0;
  while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.byteLength; if (bytes > VOICE_MAX_BYTES + 100000) { await reader.cancel(); throw new Error("Recording too long"); } chunks.push(next.value); }
  const body = new Blob(chunks as BlobPart[], { type: request.headers.get("content-type") || "" });
  return new Response(body, { headers: { "Content-Type": body.type } }).formData();
}
async function readTranscript(response: Response) {
  if (!response.body) throw new Error("Voice transcript was empty.");
  let text = "", final = "", error = "";
  const parser = createParser({ onEvent(event) { try { const data = JSON.parse(event.data); if (data.type === "transcript.text.delta") text += data.delta ?? ""; if (data.type === "transcript.text.done") final = data.text ?? ""; if (data.type === "error" || data.error) error = data.error?.message || data.message || "Transcription failed."; } catch { /* ignore keepalive */ } } });
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  while (true) { const chunk = await reader.read(); if (chunk.done) break; parser.feed(chunk.value); }
  if (error) throw new Error(error);
  return (final || text).trim();
}
export const Route = createFileRoute("/api/journal-voice")({ server: { handlers: { POST: async ({ request }) => {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > VOICE_MAX_BYTES + 100000) return json({ error: "Recording is too long. Keep it under about four minutes." }, 413);
  const auth = request.headers.get("authorization"), token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY, apiKey = process.env.LOVABLE_API_KEY;
  if (!token || token.split(".").length !== 3) return json({ error: "Sign in again before recording." }, 401);
  if (!url || !key || !apiKey) return json({ error: "Voice journal configuration is incomplete." }, 503);
  const supabase = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) return json({ error: "Sign in again before recording." }, 401);
  const context = { supabase, userId: claimsData.claims.sub, claims: claimsData.claims };
  if (!(await checkAccess(context)).hasAccess) return json({ error: "Centre membership required." }, 403);
  let form: FormData; try { form = await boundedForm(request); } catch { return json({ error: "Recording could not be read or is too long. Record again." }, 400); }
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "audio/wav" || file.size < 2048 || file.size > VOICE_MAX_BYTES) return json({ error: "Recording was empty or too long. Record again." }, 400);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const claim = await supabaseAdmin.rpc("claim_journal_voice", { p_user: context.userId });
  if (claim.error) return json({ error: claim.error.message }, claim.error.message.includes("restored") ? 403 : 429);
  const requestId = claim.data as string;
  const finish = (status: string, message?: string) => supabaseAdmin.from("journal_voice_requests").update({ status, denial_message: message ?? null }).eq("id", requestId);
  try {
    const { transcribe } = await import("@/lib/journal-ai/transcribe.server");
    const sttResponse = await transcribe({ baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-transcribe", maxFileBytes: VOICE_MAX_BYTES, audioOnly: true }, file, { signal: request.signal });
    if (!sttResponse.ok) { const e = await upstreamError(sttResponse); await finish(e.status === 403 ? "denied" : "failed", e.status === 403 ? e.message : undefined); return json({ error: e.message }, e.status); }
    const transcript = await readTranscript(sttResponse);
    if (!transcript) { await finish("failed"); return json({ error: "No speech was detected. Record again." }, 400); }
    const { createResponsesCall } = await import("@/lib/journal-ai/responses.server");
    const call = createResponsesCall(request, { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-6-astra" }, [{ role: "user", content: transcript.slice(0, 12000) }], "Extract a trading journal draft from the member's spoken recap. Use only facts they explicitly said; use null when unsure. Do not invent trades, levels, P&L, emotions or rules. bias must be long, short, neutral or null. emotion must be calm, anxious, frustrated, overconfident, flat or null. outcome must be green, red, breakeven, none or null. pnl is a signed dollar number only. notes should retain useful remaining context in concise first-person wording.", Output.object({ schema }));
    let extracted: Record<string, unknown>;
    try { extracted = (await call.result.output) as Record<string, unknown>; }
    catch (error) { if (NoObjectGeneratedError.isInstance(error) && error.finishReason !== "error" && error.text.trim()) { await finish("completed"); return json({ transcript, draft: { notes: transcript } }); } throw error; }
    await finish("completed");
    return json({ transcript, draft: normalizeVoiceDraft(extracted) });
  } catch (error) {
    const status = APICallError.isInstance(error) ? error.statusCode ?? 500 : request.signal.aborted ? 499 : 500;
    let message = status === 403 ? "Voice processing access was denied. Access must be restored before a new recording." : status === 402 ? "AI credits are unavailable. Add credits in workspace settings." : status === 429 ? "Voice processing is busy. Wait a minute, then record again." : "Voice processing failed. Your recording was not saved.";
    if (APICallError.isInstance(error) && error.responseBody) { try { const parsed = JSON.parse(error.responseBody); message = (parsed?.error?.message || parsed?.message || message).slice(0, 300); } catch { /* keep safe message */ } }
    await finish(status === 403 ? "denied" : "failed", status === 403 ? message : undefined);
    console.error("journal voice failed", status);
    return json({ error: message }, status);
  }
} } } });