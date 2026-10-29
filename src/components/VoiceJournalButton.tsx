import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recordWav } from "@/lib/record-wav";
import type { VoiceDraft } from "@/lib/journal-voice";
import { Button } from "@/components/ui/button";

export function VoiceJournalButton({ onDraft, label = "Speak recap" }: { onDraft: (draft: VoiceDraft, transcript: string) => void | Promise<void>; label?: string }) {
  const recorder = useRef<Awaited<ReturnType<typeof recordWav>> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle"), [message, setMessage] = useState(""), [error, setError] = useState("");
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); abort.current?.abort(); if (recorder.current) void recorder.current.stop().catch(() => {}); recorder.current = null; }; }, []);
  const stop = async () => {
    if (!recorder.current) return; if (timer.current) clearTimeout(timer.current);
    const active = recorder.current; recorder.current = null; setState("processing"); setMessage("Transcribing…");
    try {
      const file = await active.stop(); if (!alive.current) return; const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Sign in again before recording.");
      const form = new FormData(); form.append("file", file, file.name);
      abort.current = new AbortController();
      const response = await fetch("/api/journal-voice", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: form, signal: abort.current.signal });
      const body = await response.json().catch(() => ({})) as { error?: string; transcript?: string; draft?: VoiceDraft };
      if (!response.ok || !body.transcript || !body.draft) throw new Error(body.error || "Voice processing failed.");
      if (alive.current) { await onDraft(body.draft, body.transcript); setMessage("Voice details added. Review before saving."); }
    } catch (e) { if (alive.current) { setError(e instanceof Error ? e.message : "Voice processing failed."); setMessage(""); } }
    finally { if (alive.current) setState("idle"); }
  };
  const start = async () => {
    setError(""); setMessage(""); setState("processing");
    try { const next = await recordWav(); if (!alive.current) { await next.stop(); return; } recorder.current = next; setState("recording"); setMessage("Recording… tap stop when finished."); timer.current = setTimeout(() => void stop(), 4 * 60 * 1000); }
    catch { if (alive.current) { setError("Microphone access is required to record."); setState("idle"); } }
  };
  return <div className="space-y-2"><Button type="button" variant="outline" disabled={state === "processing"} onClick={() => state === "recording" ? void stop() : void start()} className="min-h-10 gap-2 rounded-full" title={label}>{state === "recording" ? <Square size={15} /> : <Mic size={15} />}{state === "recording" ? "Stop recording" : state === "processing" ? "Processing…" : label}</Button>{(message || error) && <p role={error ? "alert" : "status"} className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>{error || message}</p>}</div>;
}