import { Bet } from "../../domain/round/bet.entity";
import type { BetStatus } from "../../domain/round/bet-status";

export class BetResponseDto {
  id!: string;
  roundId!: string;
  userId!: string;
  amountCents!: string;
  status!: BetStatus;
  cashoutMultiplierBasisPoints!: string | null;
  payoutCents!: string | null;
  placedAt!: string;
  settledAt!: string | null;

  static fromDomain(bet: Bet): BetResponseDto {
    return {
      id: bet.id,
      roundId: bet.roundId,
      userId: bet.userId,
      amountCents: bet.amount.cents.toString(),
      status: bet.status,
      cashoutMultiplierBasisPoints: bet.cashoutMultiplier?.basisPoints.toString() ?? null,
      payoutCents: bet.payoutCents?.toString() ?? null,
      placedAt: bet.placedAt.toISOString(),
      settledAt: bet.settledAt?.toISOString() ?? null,
    };
  }
}
