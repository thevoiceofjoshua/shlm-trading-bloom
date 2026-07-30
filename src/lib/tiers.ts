export const TIER_ORDER = ["foundation", "mentorship", "elite"] as const;

export type TierKey = (typeof TIER_ORDER)[number];

export const TIERS: Record<TierKey, { name: string; amount: number; blurb: string }> = {
  foundation: {
    name: "SHLM Foundation",
    amount: 49900,
    blurb: "Self-paced breakout curriculum and private community access.",
  },
  mentorship: {
    name: "SHLM Mentorship",
    amount: 149900,
    blurb: "Weekly group mentorship, live trade reviews and Q&A.",
  },
  elite: {
    name: "SHLM Elite",
    amount: 299900,
    blurb: "1-on-1 mentor calls, private channel and priority support.",
  },
};

/** Program term used for upgrade proration. */
export const TERM_MONTHS = 12;

/**
 * Proration is only offered when the member upgrades within this window of
 * their original purchase. After that, upgrades are full price.
 */
export const PRORATION_WINDOW_DAYS = 42; // 6 weeks

export function isTierKey(value: string | null | undefined): value is TierKey {
  return !!value && (TIER_ORDER as readonly string[]).includes(value);
}

export function tierRank(tier: TierKey) {
  return TIER_ORDER.indexOf(tier);
}

export function higherTiers(tier: TierKey): TierKey[] {
  return TIER_ORDER.slice(tierRank(tier) + 1);
}

export function monthsElapsed(since: string | Date, now: Date = new Date()) {
  const start = typeof since === "string" ? new Date(since) : since;
  if (Number.isNaN(start.getTime())) return 0;
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) -
    (now.getDate() < start.getDate() ? 1 : 0);
  return Math.min(Math.max(months, 0), TERM_MONTHS);
}

export type UpgradeQuote = {
  from: TierKey;
  to: TierKey;
  monthsUsed: number;
  monthsRemaining: number;
  targetAmount: number;
  credit: number;
  amountDue: number;
  prorated: boolean;
  eligible: boolean;
  daysSincePurchase: number;
  daysRemainingInWindow: number;
  prorationWindowDays: number;
};

/**
 * Prorated upgrade price: full price of the higher tier minus a credit for the
 * months of the current tier the member has not yet used.
 */
export function quoteUpgrade(
  from: TierKey,
  to: TierKey,
  purchasedAt: string | Date,
  now: Date = new Date(),
): UpgradeQuote {
  const used = monthsElapsed(purchasedAt, now);
  const remaining = TERM_MONTHS - used;
  const paid = TIERS[from].amount;
  const targetAmount = TIERS[to].amount;
  const start = typeof purchasedAt === "string" ? new Date(purchasedAt) : purchasedAt;
  const daysSincePurchase = Number.isNaN(start.getTime())
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
  const prorated = daysSincePurchase <= PRORATION_WINDOW_DAYS;
  const credit = prorated ? Math.round((paid * remaining) / TERM_MONTHS) : 0;
  const amountDue = prorated ? Math.max(targetAmount - credit, 100) : targetAmount;
  return {
    from,
    to,
    monthsUsed: used,
    monthsRemaining: remaining,
    targetAmount,
    credit,
    amountDue,
    prorated,
    eligible: prorated,
    daysRemainingInWindow: Math.max(0, PRORATION_WINDOW_DAYS - (Number.isFinite(daysSincePurchase) ? daysSincePurchase : PRORATION_WINDOW_DAYS)),
    daysSincePurchase: Number.isFinite(daysSincePurchase) ? daysSincePurchase : 9999,
    prorationWindowDays: PRORATION_WINDOW_DAYS,
  };
}

export function formatUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
