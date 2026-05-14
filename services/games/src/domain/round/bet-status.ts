export const BET_STATUSES = ["placed", "cashed_out", "lost"] as const;

export type BetStatus = (typeof BET_STATUSES)[number];
