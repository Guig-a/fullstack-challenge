import { Inject, Injectable } from "@nestjs/common";
import type { WalletOperationRejected } from "@crash/contracts";
import { ROUND_REPOSITORY } from "../ports/round.repository";
import type { RoundRepository } from "../ports/round.repository";

export type HandleWalletOperationRejectedCommand = WalletOperationRejected["payload"] & {
  rejectedAt: Date;
};

@Injectable()
export class HandleWalletOperationRejectedHandler {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
  ) {}

  async execute(command: HandleWalletOperationRejectedCommand): Promise<void> {
    if (command.operation !== "DEBIT") {
      return;
    }

    const round = await this.rounds.findById(command.roundId);

    if (!round) {
      return;
    }

    round.rejectBet(command.betId, command.rejectedAt);
    await this.rounds.save(round);
  }
}
