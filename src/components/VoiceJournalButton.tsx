import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recordWav } from "@/lib/record-wav";
import type { VoiceDraft } from "@/lib/journal-voice";

export function VoiceJournalButton({ onDraft, label = "Speak recap" }: { onDraft: (draft: VoiceDraft, transcript: string) => void | Promise<void>; label?: string }) {
  const recorder = useRef<Awaited<ReturnType<typeof recordWav>> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle"), [message, setMessage] = useState(""), [error, setError] = useState("");
  const stop = async () => {
    if (!recorder.current) return; if (timer.current) clearTimeout(timer.current);
    const active = recorder.current; recorder.current = null; setState("processing"); setMessage("Transcribing…");
    try {
      const file = await active.stop(); const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Sign in again before recording.");
      const form = new FormData(); form.append("file", file, file.name);
      const response = await fetch("/api/journal-voice", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: form });
      const body = await response.json().catch(() => ({})) as { error?: string; transcript?: string; draft?: VoiceDraft };
      if (!response.ok || !body.transcript || !body.draft) throw new Error(body.error || "Voice processing failed.");
      await onDraft(body.draft, body.transcript); setMessage("Voice details added. Review before saving.");
    } catch (e) { setError(e instanceof Error ? e.message : "Voice processing failed."); setMessage(""); }
    finally { setState("idle"); }
  };
  const start = async () => {
    setError(""); setMessage("");
    try { recorder.current = await recordWav(); setState("recording"); setMessage("Recording… tap stop when finished."); timer.current = setTimeout(() => void stop(), 4 * 60 * 1000); }
    catch { setError("Microphone access is required to record."); setState("idle"); }
  };
  return <div className="space-y-2"><button type="button" disabled={state === "processing"} onClick={() => state === "recording" ? void stop() : void start()} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50">{state === "recording" ? <Square size={15} /> : <Mic size={15} />}{state === "recording" ? "Stop recording" : state === "processing" ? "Processing…" : label}</button>{(message || error) && <p role={error ? "alert" : "status"} className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>{error || message}</p>}</div>;
}