import { describe, expect, it } from "bun:test";
import { Money } from "../../../../src/domain/wallet/money.vo";
import { Wallet } from "../../../../src/domain/wallet/wallet.entity";
import { InsufficientFundsError, InvalidWalletOwnerError } from "../../../../src/domain/wallet/wallet.errors";

describe("Wallet", () => {
  it("creates a wallet with zero balance", () => {
    const wallet = Wallet.create("player-id");

    expect(wallet.userId).toBe("player-id");
    expect(wallet.balance.cents).toBe(0n);
    expect(wallet.id.length).toBeGreaterThan(0);
  });

  it("rejects empty owner ids", () => {
    expect(() => Wallet.create(" ")).toThrow(InvalidWalletOwnerError);
  });

  it("credits and debits using Money", () => {
    const wallet = Wallet.create("player-id");

    wallet.credit(Money.fromCents(2_000n));
    wallet.debit(Money.fromCents(750n));

    expect(wallet.balance.cents).toBe(1_250n);
  });

  it("prevents negative balances", () => {
    const wallet = Wallet.create("player-id");

    expect(() => wallet.debit(Money.fromCents(1n))).toThrow(InsufficientFundsError);
    expect(wallet.balance.cents).toBe(0n);
  });

  it("rehydrates persisted wallet state", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-01T01:00:00.000Z");

    const wallet = Wallet.rehydrate({
      id: "f352f978-ece5-4e30-95b1-2fa218068a7d",
      userId: "player-id",
      balanceCents: 9_999n,
      createdAt,
      updatedAt,
    });

    expect(wallet.toSnapshot()).toEqual({
      id: "f352f978-ece5-4e30-95b1-2fa218068a7d",
      userId: "player-id",
      balanceCents: 9_999n,
      createdAt,
      updatedAt,
    });
  });
});
