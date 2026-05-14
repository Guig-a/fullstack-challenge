import { describe, expect, it } from "bun:test";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { InvalidBetAmountError } from "../../../../src/domain/round/round.errors";

describe("BetAmount", () => {
  it("creates an amount from integer cents", () => {
    const amount = BetAmount.fromCents(1_000n);

    expect(amount.cents).toBe(1_000n);
    expect(amount.toDecimalString()).toBe("10.00");
  });

  it("accepts minimum and maximum bet amounts", () => {
    expect(BetAmount.fromCents(100n).cents).toBe(100n);
    expect(BetAmount.fromCents(100_000n).cents).toBe(100_000n);
  });

  it("rejects amounts below the minimum bet", () => {
    expect(() => BetAmount.fromCents(99n)).toThrow(InvalidBetAmountError);
  });

  it("rejects amounts above the maximum bet", () => {
    expect(() => BetAmount.fromCents(100_001n)).toThrow(InvalidBetAmountError);
  });
});
