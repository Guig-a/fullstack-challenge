import { Inject, Injectable } from "@nestjs/common";
import type { WalletOperationRejected } from "@crash/contracts";
import { ROUND_REALTIME_PUBLISHER } from "../ports/round-realtime.publisher";
import type { RoundRealtimePublisher } from "../ports/round-realtime.publisher";
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
    @Inject(ROUND_REALTIME_PUBLISHER)
    private readonly realtime: RoundRealtimePublisher,
  ) {}

  async execute(command: HandleWalletOperationRejectedCommand): Promise<void> {
    if (command.operation !== "DEBIT") {
      return;
    }

    const round = await this.rounds.findById(command.roundId);

    if (!round) {
      return;
    }

    const bet = round.rejectBet(command.betId, command.rejectedAt);
    await this.rounds.save(round);
    this.realtime.betRejected(round, bet);
  }
}
