import { describe, expect, it } from "bun:test";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { Multiplier } from "../../../../src/domain/multiplier/multiplier.vo";
import { InvalidMultiplierError } from "../../../../src/domain/round/round.errors";

describe("Multiplier", () => {
  it("creates a multiplier from basis points", () => {
    const multiplier = Multiplier.fromBasisPoints(250n);

    expect(multiplier.basisPoints).toBe(250n);
    expect(multiplier.toDecimalString()).toBe("2.50x");
  });

  it("rejects multipliers below 1.00x", () => {
    expect(() => Multiplier.fromBasisPoints(99n)).toThrow(InvalidMultiplierError);
  });

  it("calculates payout without floating point arithmetic", () => {
    const multiplier = Multiplier.fromBasisPoints(175n);
    const amount = BetAmount.fromCents(1_999n);

    expect(multiplier.calculatePayoutCents(amount)).toBe(3_498n);
  });
});
