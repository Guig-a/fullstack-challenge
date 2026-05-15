import { Bet } from "../../domain/round/bet.entity";
import { BetResponseDto } from "./bet-response.dto";

export class PlayerBetHistoryResponseDto {
  items!: BetResponseDto[];
  limit!: number;
  offset!: number;

  static fromDomain(bets: Bet[], pagination: { limit: number; offset: number }): PlayerBetHistoryResponseDto {
    return {
      items: bets.map((bet) => BetResponseDto.fromDomain(bet)),
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }
}
