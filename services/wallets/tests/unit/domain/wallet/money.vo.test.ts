import { describe, expect, it } from "bun:test";
import { Money } from "../../../../src/domain/wallet/money.vo";
import { InsufficientFundsError, InvalidMoneyAmountError } from "../../../../src/domain/wallet/wallet.errors";

describe("Money", () => {
  it("creates money from integer cents", () => {
    const amount = Money.fromCents(1_000n);

    expect(amount.cents).toBe(1_000n);
    expect(amount.toDecimalString()).toBe("10.00");
  });

  it("rejects negative amounts", () => {
    expect(() => Money.fromCents(-1n)).toThrow(InvalidMoneyAmountError);
  });

  it("adds and subtracts amounts without using floating point arithmetic", () => {
    const initial = Money.fromCents(1_050n);
    const result = initial.add(Money.fromCents(250n)).subtract(Money.fromCents(300n));

    expect(result.cents).toBe(1_000n);
    expect(result.toDecimalString()).toBe("10.00");
  });

  it("does not allow subtracting more than the current amount", () => {
    const amount = Money.fromCents(100n);

    expect(() => amount.subtract(Money.fromCents(101n))).toThrow(InsufficientFundsError);
  });
});
