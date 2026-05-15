import { Inject, Injectable } from "@nestjs/common";
import type { WalletDebited } from "@crash/contracts";
import { ROUND_REALTIME_PUBLISHER } from "../ports/round-realtime.publisher";
import type { RoundRealtimePublisher } from "../ports/round-realtime.publisher";
import { ROUND_REPOSITORY } from "../ports/round.repository";
import type { RoundRepository } from "../ports/round.repository";
import { WALLET_EVENTS_PUBLISHER } from "../ports/wallet-events.publisher";
import type { WalletEventsPublisher } from "../ports/wallet-events.publisher";

export type HandleWalletDebitedCommand = WalletDebited["payload"] & {
  debitedAt: Date;
};

@Injectable()
export class HandleWalletDebitedHandler {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
    @Inject(ROUND_REALTIME_PUBLISHER)
    private readonly realtime: RoundRealtimePublisher,
    @Inject(WALLET_EVENTS_PUBLISHER)
    private readonly walletEvents: WalletEventsPublisher,
  ) {}

  async execute(command: HandleWalletDebitedCommand): Promise<void> {
    const round = await this.rounds.findById(command.roundId);

    if (!round) {
      return;
    }

    const bet = round.bets.find((roundBet) => roundBet.id === command.betId);

    if (!bet) {
      return;
    }

    if (bet.status === "rejected") {
      this.walletEvents.requestCredit({
        walletUserId: command.walletUserId,
        roundId: command.roundId,
        betId: command.betId,
        amountCents: BigInt(command.amountCents),
      });
      return;
    }

    const wasPendingDebit = bet.status === "pending_debit";
    const confirmedBet = round.confirmBetDebit(command.betId);

    if (!wasPendingDebit) {
      return;
    }

    await this.rounds.save(round);
    this.realtime.betConfirmed(round, confirmedBet);
  }
}
