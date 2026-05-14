import { describe, expect, it } from "bun:test";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { Multiplier } from "../../../../src/domain/multiplier/multiplier.vo";
import { Bet } from "../../../../src/domain/round/bet.entity";
import { BetAlreadySettledError } from "../../../../src/domain/round/round.errors";

describe("Bet", () => {
  const placedAt = new Date("2026-01-01T00:00:00.000Z");
  const settledAt = new Date("2026-01-01T00:00:03.000Z");

  it("creates a placed bet", () => {
    const bet = Bet.create({
      id: "bet-id",
      roundId: "round-id",
      userId: "player-id",
      amount: BetAmount.fromCents(1_000n),
      placedAt,
    });

    expect(bet.id).toBe("bet-id");
    expect(bet.roundId).toBe("round-id");
    expect(bet.userId).toBe("player-id");
    expect(bet.status).toBe("placed");
    expect(bet.amount.cents).toBe(1_000n);
    expect(bet.payoutCents).toBeNull();
  });

  it("cashouts a pending bet and stores the payout", () => {
    const bet = Bet.create({
      id: "bet-id",
      roundId: "round-id",
      userId: "player-id",
      amount: BetAmount.fromCents(2_000n),
      placedAt,
    });

    bet.cashOut(Multiplier.fromBasisPoints(175n), settledAt);

    expect(bet.status).toBe("cashed_out");
    expect(bet.cashoutMultiplier?.basisPoints).toBe(175n);
    expect(bet.payoutCents).toBe(3_500n);
    expect(bet.settledAt).toBe(settledAt);
  });

  it("marks a pending bet as lost", () => {
    const bet = Bet.create({
      id: "bet-id",
      roundId: "round-id",
      userId: "player-id",
      amount: BetAmount.fromCents(2_000n),
      placedAt,
    });

    bet.markLost(settledAt);

    expect(bet.status).toBe("lost");
    expect(bet.payoutCents).toBeNull();
    expect(bet.settledAt).toBe(settledAt);
  });

  it("rejects settling an already settled bet", () => {
    const bet = Bet.create({
      id: "bet-id",
      roundId: "round-id",
      userId: "player-id",
      amount: BetAmount.fromCents(2_000n),
      placedAt,
    });

    bet.cashOut(Multiplier.fromBasisPoints(175n), settledAt);

    expect(() => bet.markLost(settledAt)).toThrow(BetAlreadySettledError);
  });
});
