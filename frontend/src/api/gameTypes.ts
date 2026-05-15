export type RoundStatus = "betting" | "running" | "crashed";

export type BetStatus =
  | "pending_debit"
  | "placed"
  | "cashed_out"
  | "lost"
  | "rejected";

export type RoundProofResponse = {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  hmac?: string | null;
  serverSeed?: string | null;
};

export type CurrentRoundResponse = {
  id: string;
  status: RoundStatus;
  crashPointBasisPoints: string;
  proof: RoundProofResponse;
  bets: BetResponse[];
  createdAt: string;
  startedAt: string | null;
  crashedAt: string | null;
};

export type BetResponse = {
  id: string;
  roundId: string;
  userId: string;
  amountCents: string;
  status: BetStatus;
  cashoutMultiplierBasisPoints: string | null;
  payoutCents: string | null;
  placedAt: string;
  settledAt: string | null;
};

export type PlaceBetRequest = {
  amountCents: string;
};

export type PlayerBetHistoryResponse = {
  items: BetResponse[];
  limit: number;
  offset: number;
};
