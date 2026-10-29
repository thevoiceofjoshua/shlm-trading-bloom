import { z } from "zod";

// Existing Founder identity; roles must also be verified on the server.
export const INDICATOR_OWNER_ID = "27be6c2d-ce77-425b-bc69-53026daf099b";
export const tradingViewUsername = z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9_]+$/, "Use the TradingView username only: letters, numbers and underscores.");
export const requestInput = z.object({
  indicatorId: z.string().uuid(),
  username: tradingViewUsername,
  note: z.string().trim().max(500).default(""),
  submissionId: z.string().uuid(),
});
export const indicatorInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  active: z.boolean().default(true),
});
export function canManageIndicators(userId: string, hasAdminRole: boolean) {
  return userId === INDICATOR_OWNER_ID && hasAdminRole;
}