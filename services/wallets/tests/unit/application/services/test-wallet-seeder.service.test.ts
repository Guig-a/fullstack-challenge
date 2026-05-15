import { describe, expect, it } from "bun:test";
import type { ConfigService } from "@nestjs/config";
import { TestWalletSeederService } from "../../../../src/application/services/test-wallet-seeder.service";
import type { WalletRepository } from "../../../../src/application/ports/wallet.repository";
import { Money } from "../../../../src/domain/wallet/money.vo";
import { Wallet } from "../../../../src/domain/wallet/wallet.entity";

class FakeWalletRepository implements WalletRepository {
  wallet: Wallet | null = null;
  savedWallet: Wallet | null = null;

  findByUserId(): Promise<Wallet | null> {
    return Promise.resolve(this.wallet);
  }

  save(wallet: Wallet): Promise<Wallet> {
    this.savedWallet = wallet;
    this.wallet = wallet;

    return Promise.resolve(wallet);
  }
}

class FakeConfigService implements Pick<ConfigService, "get"> {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get(key: string): string | undefined {
    return this.values[key];
  }
}

describe("TestWalletSeederService", () => {
  it("creates a test wallet with the configured initial balance", async () => {
    const repository = new FakeWalletRepository();
    const seeder = createSeeder(repository);

    const wallet = await seeder.seed();

    expect(wallet?.userId).toBe("player-id");
    expect(wallet?.balance.cents).toBe(100_000n);
    expect(repository.savedWallet?.balance.cents).toBe(100_000n);
  });

  it("does not alter an existing test wallet", async () => {
    const repository = new FakeWalletRepository();
    const existingWallet = Wallet.create("player-id");
    existingWallet.credit(Money.fromCents(12_345n));
    repository.wallet = existingWallet;
    const seeder = createSeeder(repository);

    const wallet = await seeder.seed();

    expect(wallet).toBe(existingWallet);
    expect(repository.savedWallet).toBeNull();
    expect(existingWallet.balance.cents).toBe(12_345n);
  });

  it("skips seeding when test wallet config is absent", async () => {
    const repository = new FakeWalletRepository();
    const seeder = new TestWalletSeederService(repository, new FakeConfigService({}) as ConfigService);

    await expect(seeder.seed()).resolves.toBeNull();
    expect(repository.savedWallet).toBeNull();
  });

  it("rejects invalid initial balance config", async () => {
    const repository = new FakeWalletRepository();
    const seeder = new TestWalletSeederService(
      repository,
      new FakeConfigService({
        TEST_PLAYER_USER_ID: "player-id",
        TEST_PLAYER_INITIAL_BALANCE_CENTS: "100.00",
      }) as ConfigService,
    );

    await expect(seeder.seed()).rejects.toThrow("TEST_PLAYER_INITIAL_BALANCE_CENTS must be an integer string");
  });

  function createSeeder(repository: FakeWalletRepository): TestWalletSeederService {
    return new TestWalletSeederService(
      repository,
      new FakeConfigService({
        TEST_PLAYER_USER_ID: "player-id",
        TEST_PLAYER_INITIAL_BALANCE_CENTS: "100000",
      }) as ConfigService,
    );
  }
});
