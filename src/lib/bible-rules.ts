import { z } from "zod";
export const bibleMessageInput = z.object({ body: z.string().trim().min(1).max(2000), replyTo: z.string().uuid().nullable().default(null), submissionId: z.string().uuid() });
export const teachingInput = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(150), description: z.string().trim().max(5000).default(""), scripture: z.string().trim().max(300).default(""), published: z.boolean().default(false), featured: z.boolean().default(false) });
export const FREE_VIDEO_LIMIT = 10;
export function canPostBible(member: { active: boolean; blocked: boolean; muted_until: string | null } | null, now: Date) {
  return !!member?.active && !member.blocked && (!member.muted_until || Date.parse(member.muted_until) <= now.getTime());
}
/** Name shown for a Bible Study member: the name they signed up with, never an ID. */
export function bibleDisplayName(metadata: Record<string, unknown> | null | undefined, email?: string | null): string {
  const pick = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : "");
  return pick(metadata?.full_name) || pick(metadata?.name) || pick(email) || "Member";
}