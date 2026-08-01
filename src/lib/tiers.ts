/**
 * SHLM pricing model.
 *
 * One-time enrollment: $500 for 8 weeks of the program.
 * Extensions: $150 per additional month after the initial 8 weeks.
 */

export const PROGRAM = {
  key: "program" as const,
  name: "SHLM Mentorship",
  amount: 50_000, // $500.00 in cents
  weeks: 8,
  blurb: "8 weeks of full mentorship access — curriculum, live sessions and community.",
};

export const EXTENSION = {
  key: "extension" as const,
  name: "SHLM Monthly Extension",
  amount: 15_000, // $150.00 per month in cents
  blurb: "Add another month of mentorship, community and live sessions.",
};

export type PurchaseKind = typeof PROGRAM.key | typeof EXTENSION.key;

export const PURCHASE_KINDS: PurchaseKind[] = [PROGRAM.key, EXTENSION.key];

export function isPurchaseKind(value: string | null | undefined): value is PurchaseKind {
  return !!value && (PURCHASE_KINDS as string[]).includes(value);
}

/** Legacy tier keys from the old three-tier model still present in old rows. */
const LEGACY_NAMES: Record<string, string> = {
  foundation: "SHLM Foundation (legacy)",
  mentorship: "SHLM Mentorship (legacy)",
  elite: "SHLM Elite (legacy)",
};

export function purchaseName(tier: string) {
  if (tier === PROGRAM.key) return PROGRAM.name;
  if (tier === EXTENSION.key) return EXTENSION.name;
  return LEGACY_NAMES[tier] ?? "SHLM Mentorship";
}

export const DAY_MS = 86_400_000;

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

export type AccessWindow = {
  startedAt: string;
  /** Months added on top of the initial 8-week term. */
  extensionMonths: number;
  endsAt: string;
  daysRemaining: number;
  active: boolean;
};

/**
 * Access runs 8 weeks from the enrollment purchase, plus one month for every
 * extension month purchased.
 */
export function accessWindow(
  purchasedAt: string | Date,
  extensionMonths = 0,
  now: Date = new Date(),
): AccessWindow {
  const start = typeof purchasedAt === "string" ? new Date(purchasedAt) : purchasedAt;
  const base = addDays(start, PROGRAM.weeks * 7);
  const end = extensionMonths > 0 ? addMonths(base, extensionMonths) : base;
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / DAY_MS);
  return {
    startedAt: start.toISOString(),
    extensionMonths,
    endsAt: end.toISOString(),
    daysRemaining,
    active: daysRemaining > 0,
  };
}

export function extensionTotal(months: number) {
  return EXTENSION.amount * Math.max(1, months);
}

export function formatUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
