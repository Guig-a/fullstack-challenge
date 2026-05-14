import { describe, expect, it } from "bun:test";
import type { CurrentMultiplierProvider } from "../../../../src/application/ports/current-multiplier.provider";
import type { RoundHistoryQuery, RoundRepository } from "../../../../src/application/ports/round.repository";
import { CashOutBetHandler } from "../../../../src/application/use-cases/cash-out-bet.handler";
import { CurrentRoundNotFoundError } from "../../../../src/application/use-cases/current-round-not-found.error";
import { PlaceBetHandler } from "../../../../src/application/use-cases/place-bet.handler";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { Multiplier } from "../../../../src/domain/multiplier/multiplier.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";
import { Round } from "../../../../src/domain/round/round.entity";
import { DuplicateBetError } from "../../../../src/domain/round/round.errors";

class FakeRoundRepository implements RoundRepository {
  currentRound: Round | null = null;
  savedRound: Round | null = null;

  findById(): Promise<Round | null> {
    return Promise.resolve(null);
  }

  findCurrent(): Promise<Round | null> {
    return Promise.resolve(this.currentRound);
  }

  findHistory(_query: RoundHistoryQuery): Promise<Round[]> {
    return Promise.resolve([]);
  }

  save(round: Round): Promise<Round> {
    this.savedRound = round;

    return Promise.resolve(round);
  }
}

class FixedMultiplierProvider implements CurrentMultiplierProvider {
  constructor(private readonly multiplier: Multiplier) {}

  getCurrentMultiplier(): Multiplier {
    return this.multiplier;
  }
}

describe("bet command handlers", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const startedAt = new Date("2026-01-01T00:00:10.000Z");
  const commandAt = new Date("2026-01-01T00:00:12.000Z");

  function createRound(): Round {
    return Round.create({
      id: "round-id",
      crashPoint: CrashPoint.fromBasisPoints(250n),
      proof: RoundProof.create({
        serverSeedHash: SeedHash.fromHex("09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825"),
        serverSeed: CrashSeed.fromString("server-seed-alpha"),
        clientSeed: CrashSeed.fromString("player-seed-alpha"),
        nonce: 0n,
        hmac: "057ce87fd5846bbe4e329c9d2402c6014100b7dad26282f960bd0e97a6a8485f",
      }),
      now: createdAt,
    });
  }

  it("places a bet in the current betting round and persists it", async () => {
    const repository = new FakeRoundRepository();
    repository.currentRound = createRound();
    const handler = new PlaceBetHandler(repository);

    const bet = await handler.execute({
      userId: "player-id",
      amountCents: 1_000n,
      placedAt: commandAt,
    });

    expect(bet.userId).toBe("player-id");
    expect(bet.amount.cents).toBe(1_000n);
    expect(repository.savedRound?.bets).toHaveLength(1);
  });

  it("rejects placing a bet without a current round", async () => {
    const repository = new FakeRoundRepository();
    const handler = new PlaceBetHandler(repository);

    await expect(
      handler.execute({
        userId: "player-id",
        amountCents: 1_000n,
        placedAt: commandAt,
      }),
    ).rejects.toThrow(CurrentRoundNotFoundError);
  });

  it("rejects duplicate bets from the same player", async () => {
    const repository = new FakeRoundRepository();
    const round = createRound();
    round.placeBet("player-id", BetAmount.fromCents(1_000n), commandAt);
    repository.currentRound = round;
    const handler = new PlaceBetHandler(repository);

    await expect(
      handler.execute({
        userId: "player-id",
        amountCents: 2_000n,
        placedAt: commandAt,
      }),
    ).rejects.toThrow(DuplicateBetError);
  });

  it("cashouts a bet using a server-side multiplier provider", async () => {
    const repository = new FakeRoundRepository();
    const round = createRound();
    round.placeBet("player-id", BetAmount.fromCents(2_000n), createdAt);
    round.start(startedAt);
    repository.currentRound = round;
    const handler = new CashOutBetHandler(repository, new FixedMultiplierProvider(Multiplier.fromBasisPoints(175n)));

    const bet = await handler.execute({
      userId: "player-id",
      cashedOutAt: commandAt,
    });

    expect(bet.status).toBe("cashed_out");
    expect(bet.payoutCents).toBe(3_500n);
    expect(repository.savedRound?.bets[0]?.status).toBe("cashed_out");
  });

  it("rejects cashout without a current round", async () => {
    const repository = new FakeRoundRepository();
    const handler = new CashOutBetHandler(repository, new FixedMultiplierProvider(Multiplier.fromBasisPoints(175n)));

    await expect(
      handler.execute({
        userId: "player-id",
        cashedOutAt: commandAt,
      }),
    ).rejects.toThrow(CurrentRoundNotFoundError);
  });
});
