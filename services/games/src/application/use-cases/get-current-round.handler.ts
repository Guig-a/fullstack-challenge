import { Inject, Injectable } from "@nestjs/common";
import { Round } from "../../domain/round/round.entity";
import { ROUND_REPOSITORY } from "../ports/round.repository";
import type { RoundRepository } from "../ports/round.repository";

@Injectable()
export class GetCurrentRoundHandler {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
  ) {}

  execute(): Promise<Round | null> {
    return this.rounds.findCurrent();
  }
}
