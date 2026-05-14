export const ROUND_STATUSES = ["betting", "running", "crashed"] as const;

export type RoundStatus = (typeof ROUND_STATUSES)[number];
