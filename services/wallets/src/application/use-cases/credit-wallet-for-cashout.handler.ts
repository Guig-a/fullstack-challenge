import { Inject, Injectable } from "@nestjs/common";
import { Money } from "../../domain/wallet/money.vo";
import { Wallet } from "../../domain/wallet/wallet.entity";
import { WALLET_REPOSITORY } from "../ports/wallet.repository";
import type { WalletRepository } from "../ports/wallet.repository";
import { WalletNotFoundError } from "./wallet-not-found.error";

export type CreditWalletForCashoutCommand = {
  userId: string;
  amountCents: bigint;
};

@Injectable()
export class CreditWalletForCashoutHandler {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly wallets: WalletRepository,
  ) {}

  async execute(command: CreditWalletForCashoutCommand): Promise<Wallet> {
    const wallet = await this.wallets.findByUserId(command.userId);

    if (!wallet) {
      throw new WalletNotFoundError();
    }

    wallet.credit(Money.fromCents(command.amountCents));

    return this.wallets.save(wallet);
  }
}
