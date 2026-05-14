import { Inject, Injectable } from "@nestjs/common";
import { Bet } from "../../domain/round/bet.entity";
import { CURRENT_MULTIPLIER_PROVIDER } from "../ports/current-multiplier.provider";
import type { CurrentMultiplierProvider } from "../ports/current-multiplier.provider";
import { ROUND_REPOSITORY } from "../ports/round.repository";
import type { RoundRepository } from "../ports/round.repository";
import { CurrentRoundNotFoundError } from "./current-round-not-found.error";

export type CashOutBetCommand = {
  userId: string;
  cashedOutAt: Date;
};

@Injectable()
export class CashOutBetHandler {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
    @Inject(CURRENT_MULTIPLIER_PROVIDER)
    private readonly currentMultiplier: CurrentMultiplierProvider,
  ) {}

  async execute(command: CashOutBetCommand): Promise<Bet> {
    const round = await this.rounds.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
    }

    const multiplier = this.currentMultiplier.getCurrentMultiplier(round, command.cashedOutAt);
    const bet = round.cashOut(command.userId, multiplier, command.cashedOutAt);
    await this.rounds.save(round);

    return bet;
  }
}
