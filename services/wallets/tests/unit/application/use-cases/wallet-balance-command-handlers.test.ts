import { describe, expect, it } from "bun:test";
import { CreditWalletForCashoutHandler } from "../../../../src/application/use-cases/credit-wallet-for-cashout.handler";
import { DebitWalletForBetHandler } from "../../../../src/application/use-cases/debit-wallet-for-bet.handler";
import { WalletNotFoundError } from "../../../../src/application/use-cases/wallet-not-found.error";
import { Money } from "../../../../src/domain/wallet/money.vo";
import { Wallet } from "../../../../src/domain/wallet/wallet.entity";
import type { WalletRepository } from "../../../../src/application/ports/wallet.repository";

class FakeWalletRepository implements WalletRepository {
  wallet: Wallet | null = null;
  savedWallet: Wallet | null = null;

  findByUserId(): Promise<Wallet | null> {
    return Promise.resolve(this.wallet);
  }

  save(wallet: Wallet): Promise<Wallet> {
    this.savedWallet = wallet;

    return Promise.resolve(wallet);
  }
}

describe("wallet balance command handlers", () => {
  it("debits wallet balance for a bet", async () => {
    const repository = new FakeWalletRepository();
    const wallet = Wallet.create("player-id");
    wallet.credit(Money.fromCents(2_000n));
    repository.wallet = wallet;
    const handler = new DebitWalletForBetHandler(repository);

    const debitedWallet = await handler.execute({ userId: "player-id", amountCents: 750n });

    expect(debitedWallet.balance.cents).toBe(1_250n);
    expect(repository.savedWallet?.balance.cents).toBe(1_250n);
  });

  it("credits wallet balance for a cashout", async () => {
    const repository = new FakeWalletRepository();
    repository.wallet = Wallet.create("player-id");
    const handler = new CreditWalletForCashoutHandler(repository);

    const creditedWallet = await handler.execute({ userId: "player-id", amountCents: 1_500n });

    expect(creditedWallet.balance.cents).toBe(1_500n);
    expect(repository.savedWallet?.balance.cents).toBe(1_500n);
  });

  it("rejects debits when wallet is missing", async () => {
    const repository = new FakeWalletRepository();
    const handler = new DebitWalletForBetHandler(repository);

    await expect(handler.execute({ userId: "player-id", amountCents: 750n })).rejects.toThrow(WalletNotFoundError);
  });

  it("rejects credits when wallet is missing", async () => {
    const repository = new FakeWalletRepository();
    const handler = new CreditWalletForCashoutHandler(repository);

    await expect(handler.execute({ userId: "player-id", amountCents: 1_500n })).rejects.toThrow(WalletNotFoundError);
  });
});
