import { Inject, Injectable } from "@nestjs/common";
import { Bet } from "../../domain/round/bet.entity";
import { ROUND_REPOSITORY } from "../ports/round.repository";
import type { PlayerBetHistoryQuery, RoundRepository } from "../ports/round.repository";

@Injectable()
export class GetPlayerBetHistoryHandler {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
  ) {}

  execute(query: PlayerBetHistoryQuery): Promise<Bet[]> {
    return this.rounds.findBetsByUserId(query);
  }
}
