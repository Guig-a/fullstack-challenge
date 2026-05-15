import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Money } from "../../domain/wallet/money.vo";
import { Wallet } from "../../domain/wallet/wallet.entity";
import { WALLET_REPOSITORY } from "../ports/wallet.repository";
import type { WalletRepository } from "../ports/wallet.repository";

@Injectable()
export class TestWalletSeederService implements OnModuleInit {
  private readonly logger = new Logger(TestWalletSeederService.name);

  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly wallets: WalletRepository,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<Wallet | null> {
    const userId = this.config.get<string>("TEST_PLAYER_USER_ID");
    const initialBalanceCents = this.getInitialBalanceCents();

    if (!userId || initialBalanceCents === null) {
      return null;
    }

    const existingWallet = await this.wallets.findByUserId(userId);

    if (existingWallet) {
      return existingWallet;
    }

    const wallet = Wallet.create(userId);
    wallet.credit(Money.fromCents(initialBalanceCents));
    const savedWallet = await this.wallets.save(wallet);
    this.logger.log(`Seeded test wallet for ${userId} with ${initialBalanceCents.toString()} cents`);

    return savedWallet;
  }

  private getInitialBalanceCents(): bigint | null {
    const value = this.config.get<string>("TEST_PLAYER_INITIAL_BALANCE_CENTS");

    if (!value) {
      return null;
    }

    if (!/^\d+$/.test(value)) {
      throw new Error("TEST_PLAYER_INITIAL_BALANCE_CENTS must be an integer string");
    }

    return BigInt(value);
  }
}
