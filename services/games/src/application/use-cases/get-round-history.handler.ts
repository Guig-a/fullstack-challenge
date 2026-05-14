import { Inject, Injectable } from "@nestjs/common";
import { Round } from "../../domain/round/round.entity";
import { ROUND_REPOSITORY } from "../ports/round.repository";
import type { RoundHistoryQuery, RoundRepository } from "../ports/round.repository";

@Injectable()
export class GetRoundHistoryHandler {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
  ) {}

  execute(query: RoundHistoryQuery): Promise<Round[]> {
    return this.rounds.findHistory(query);
  }
}
