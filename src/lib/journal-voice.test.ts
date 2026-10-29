import { describe, expect, it } from "vitest";
import { mergeVoiceText, normalizeVoiceDraft } from "./journal-voice";
describe("voice journal draft", () => {
  it("keeps only supported journal choices and valid dollar P&L", () => { expect(normalizeVoiceDraft({ emotion: "Calm", outcome: "profitable", pnl: "+$125.50", bias: "sideways" })).toEqual({ emotion: "calm", pnl: "125.50" }); });
  it("does not erase existing text when voice details are added", () => { expect(mergeVoiceText("Waited", "Took the retest")).toBe("Waited\n\nTook the retest"); });
});