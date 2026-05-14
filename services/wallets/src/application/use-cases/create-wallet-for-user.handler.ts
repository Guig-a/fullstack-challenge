import { Inject, Injectable } from "@nestjs/common";
import { Wallet } from "../../domain/wallet/wallet.entity";
import { WALLET_REPOSITORY } from "../ports/wallet.repository";
import type { WalletRepository } from "../ports/wallet.repository";

@Injectable()
export class CreateWalletForUserHandler {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly wallets: WalletRepository,
  ) {}

  async execute(userId: string): Promise<Wallet> {
    const existingWallet = await this.wallets.findByUserId(userId);

    if (existingWallet) {
      return existingWallet;
    }

    const wallet = Wallet.create(userId);

    return this.wallets.save(wallet);
  }
}
