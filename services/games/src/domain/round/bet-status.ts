export const BET_STATUSES = ["pending_debit", "placed", "cashed_out", "lost", "rejected"] as const;

export type BetStatus = (typeof BET_STATUSES)[number];
