import { Inject, Injectable } from "@nestjs/common";
import { Wallet } from "../../domain/wallet/wallet.entity";
import { WALLET_REPOSITORY } from "../ports/wallet.repository";
import type { WalletRepository } from "../ports/wallet.repository";
import { WalletNotFoundError } from "./wallet-not-found.error";

@Injectable()
export class GetWalletForUserHandler {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly wallets: WalletRepository,
  ) {}

  async execute(userId: string): Promise<Wallet> {
    const wallet = await this.wallets.findByUserId(userId);

    if (!wallet) {
      throw new WalletNotFoundError();
    }

    return wallet;
  }
}
