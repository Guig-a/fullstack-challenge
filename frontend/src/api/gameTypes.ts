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
};

export type CurrentRoundResponse = {
  id: string;
  status: RoundStatus;
  crashPointBasisPoints: string | null;
  currentMultiplierBasisPoints: string;
  proof: RoundProofResponse;
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
  autoCashOutMultiplierBasisPoints: string | null;
  cashedOutMultiplierBasisPoints: string | null;
  payoutCents: string | null;
  createdAt: string;
};

export type PlaceBetRequest = {
  amountCents: string;
  autoCashOutMultiplierBasisPoints?: string;
};

export type PlayerBetHistoryResponse = {
  items: BetResponse[];
  limit: number;
  offset: number;
};
