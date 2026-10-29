import { describe, it, expect } from "vitest";
import { bibleMessageInput, canPostBible, FREE_VIDEO_LIMIT, teachingInput } from "./bible-rules";
describe("independent Bible Study rules", () => {
  it("requires joined and unblocked membership, independently of purchases", () => { expect(canPostBible(null,new Date())).toBe(false); expect(canPostBible({ active:true,blocked:false,muted_until:null },new Date())).toBe(true); expect(canPostBible({ active:false,blocked:false,muted_until:null },new Date())).toBe(false); expect(canPostBible({ active:true,blocked:true,muted_until:null },new Date())).toBe(false); });
  it("honors timed moderation", () => { expect(canPostBible({ active:true,blocked:false,muted_until:"2026-10-30T00:00:00Z" },new Date("2026-10-29T00:00:00Z"))).toBe(false); });
  it("requires bounded message and stable identity", () => { expect(bibleMessageInput.safeParse({body:" ",submissionId:"27be6c2d-ce77-425b-bc69-53026daf099b"}).success).toBe(false); expect(bibleMessageInput.safeParse({body:"Amen",submissionId:"27be6c2d-ce77-425b-bc69-53026daf099b"}).success).toBe(true); });
  it("requires a title before saving a teaching", () => { expect(teachingInput.safeParse({title:" "}).success).toBe(false); });
  it("keeps the no-upgrade upload limit at ten assets", () => { expect(FREE_VIDEO_LIMIT).toBe(10); });
});