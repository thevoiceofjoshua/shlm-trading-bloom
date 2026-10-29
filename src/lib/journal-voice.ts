export const VOICE_MAX_BYTES = 10 * 1024 * 1024;
export const VOICE_FIELDS = ["bias", "levels", "wentWell", "wentWrong", "emotion", "outcome", "rule", "notes", "pnl"] as const;
export type VoiceDraft = Partial<Record<(typeof VOICE_FIELDS)[number], string>>;
const CHOICES: Record<string, string[]> = { bias: ["long", "short", "neutral"], emotion: ["calm", "anxious", "frustrated", "overconfident", "flat"], outcome: ["green", "red", "breakeven", "none"] };
export function normalizeVoiceDraft(input: Record<string, unknown>): VoiceDraft {
  const out: VoiceDraft = {};
  for (const key of VOICE_FIELDS) {
    const raw = input[key];
    if (typeof raw !== "string") continue;
    let value = raw.trim().slice(0, key === "notes" ? 4000 : 1000);
    if (!value) continue;
    const choices = CHOICES[key];
    if (choices && !choices.includes(value.toLowerCase())) continue;
    if (choices) value = value.toLowerCase();
    if (key === "pnl") { const clean = value.replace(/[^0-9.-]/g, ""); if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) continue; value = clean; }
    out[key] = value;
  }
  return out;
}
export function mergeVoiceText(current: string, spoken: string) { return current.trim() ? `${current.trim()}\n\n${spoken}` : spoken; }