import { Inject, Injectable } from "@nestjs/common";
import { Bet } from "../../domain/round/bet.entity";
import { BetAmount } from "../../domain/money/bet-amount.vo";
import { ROUND_REPOSITORY } from "../ports/round.repository";
import type { RoundRepository } from "../ports/round.repository";
import { WALLET_EVENTS_PUBLISHER } from "../ports/wallet-events.publisher";
import type { WalletEventsPublisher } from "../ports/wallet-events.publisher";
import { CurrentRoundNotFoundError } from "./current-round-not-found.error";

export type PlaceBetCommand = {
  userId: string;
  amountCents: bigint;
  placedAt: Date;
};

@Injectable()
export class PlaceBetHandler {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
    @Inject(WALLET_EVENTS_PUBLISHER)
    private readonly walletEvents: WalletEventsPublisher,
  ) {}

  async execute(command: PlaceBetCommand): Promise<Bet> {
    const round = await this.rounds.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
    }

    const bet = round.placeBet(command.userId, BetAmount.fromCents(command.amountCents), command.placedAt);
    await this.rounds.save(round);
    this.walletEvents.requestDebit({
      walletUserId: command.userId,
      roundId: round.id,
      betId: bet.id,
      amountCents: bet.amount.cents,
    });

    return bet;
  }
}
