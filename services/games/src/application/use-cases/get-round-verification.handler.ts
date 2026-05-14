import { Inject, Injectable } from "@nestjs/common";
import { Round } from "../../domain/round/round.entity";
import { ROUND_REPOSITORY } from "../ports/round.repository";
import type { RoundRepository } from "../ports/round.repository";
import { RoundNotFoundError } from "./round-not-found.error";
import { RoundVerificationUnavailableError } from "./round-verification-unavailable.error";

@Injectable()
export class GetRoundVerificationHandler {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
  ) {}

  async execute(roundId: string): Promise<Round> {
    const round = await this.rounds.findById(roundId);

    if (!round) {
      throw new RoundNotFoundError();
    }

    if (round.status !== "crashed") {
      throw new RoundVerificationUnavailableError();
    }

    return round;
  }
}
