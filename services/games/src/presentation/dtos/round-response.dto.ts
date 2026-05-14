import { Round } from "../../domain/round/round.entity";
import type { RoundStatus } from "../../domain/round/round-status";
import { BetResponseDto } from "./bet-response.dto";
import { RoundProofResponseDto } from "./round-proof-response.dto";

export class RoundResponseDto {
  id!: string;
  status!: RoundStatus;
  crashPointBasisPoints!: string;
  proof!: RoundProofResponseDto;
  bets!: BetResponseDto[];
  createdAt!: string;
  startedAt!: string | null;
  crashedAt!: string | null;

  static fromDomain(round: Round): RoundResponseDto {
    return {
      id: round.id,
      status: round.status,
      crashPointBasisPoints: round.crashPoint.basisPoints.toString(),
      proof: RoundProofResponseDto.fromDomain(round),
      bets: round.bets.map((bet) => BetResponseDto.fromDomain(bet)),
      createdAt: round.createdAt.toISOString(),
      startedAt: round.startedAt?.toISOString() ?? null,
      crashedAt: round.crashedAt?.toISOString() ?? null,
    };
  }
}
