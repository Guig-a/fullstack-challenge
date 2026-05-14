import { Inject, Injectable } from "@nestjs/common";
import { Money } from "../../domain/wallet/money.vo";
import { Wallet } from "../../domain/wallet/wallet.entity";
import { WALLET_REPOSITORY } from "../ports/wallet.repository";
import type { WalletRepository } from "../ports/wallet.repository";
import { WalletNotFoundError } from "./wallet-not-found.error";

export type DebitWalletForBetCommand = {
  userId: string;
  amountCents: bigint;
};

@Injectable()
export class DebitWalletForBetHandler {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly wallets: WalletRepository,
  ) {}

  async execute(command: DebitWalletForBetCommand): Promise<Wallet> {
    const wallet = await this.wallets.findByUserId(command.userId);

    if (!wallet) {
      throw new WalletNotFoundError();
    }

    wallet.debit(Money.fromCents(command.amountCents));

    return this.wallets.save(wallet);
  }
}
