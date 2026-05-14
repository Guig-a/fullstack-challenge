import { Round } from "../../domain/round/round.entity";
import { RoundResponseDto } from "./round-response.dto";

export class RoundHistoryResponseDto {
  items!: RoundResponseDto[];
  limit!: number;
  offset!: number;

  static fromDomain(rounds: Round[], pagination: { limit: number; offset: number }): RoundHistoryResponseDto {
    return {
      items: rounds.map((round) => RoundResponseDto.fromDomain(round)),
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }
}
