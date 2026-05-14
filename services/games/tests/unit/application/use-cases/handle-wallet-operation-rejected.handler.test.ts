import { describe, expect, it } from "bun:test";
import type { RoundHistoryQuery, RoundRepository } from "../../../../src/application/ports/round.repository";
import { HandleWalletOperationRejectedHandler } from "../../../../src/application/use-cases/handle-wallet-operation-rejected.handler";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";
import { Round } from "../../../../src/domain/round/round.entity";

class FakeRoundRepository implements RoundRepository {
  round: Round | null = null;
  savedRound: Round | null = null;

  findById(): Promise<Round | null> {
    return Promise.resolve(this.round);
  }

  findCurrent(): Promise<Round | null> {
    return Promise.resolve(null);
  }

  findHistory(_query: RoundHistoryQuery): Promise<Round[]> {
    return Promise.resolve([]);
  }

  save(round: Round): Promise<Round> {
    this.savedRound = round;

    return Promise.resolve(round);
  }
}

describe("HandleWalletOperationRejectedHandler", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const rejectedAt = new Date("2026-01-01T00:00:01.000Z");

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

  it("marks a bet as rejected when wallet debit fails", async () => {
    const repository = new FakeRoundRepository();
    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    repository.round = round;
    const handler = new HandleWalletOperationRejectedHandler(repository);

    await handler.execute({
      walletUserId: "player-id",
      roundId: round.id,
      betId: bet.id,
      operation: "DEBIT",
      reason: "INSUFFICIENT_FUNDS",
      rejectedAt,
    });

    expect(repository.savedRound?.bets.find((savedBet) => savedBet.id === bet.id)?.status).toBe("rejected");
  });

  it("does not mutate the round when wallet credit fails", async () => {
    const repository = new FakeRoundRepository();
    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    repository.round = round;
    const handler = new HandleWalletOperationRejectedHandler(repository);

    await handler.execute({
      walletUserId: "player-id",
      roundId: round.id,
      betId: bet.id,
      operation: "CREDIT",
      reason: "WALLET_NOT_FOUND",
      rejectedAt,
    });

    expect(repository.savedRound).toBeNull();
    expect(bet.status).toBe("placed");
  });

  it("ignores debit rejection for unknown rounds", async () => {
    const repository = new FakeRoundRepository();
    const handler = new HandleWalletOperationRejectedHandler(repository);

    await handler.execute({
      walletUserId: "player-id",
      roundId: "unknown-round",
      betId: "bet-id",
      operation: "DEBIT",
      reason: "WALLET_NOT_FOUND",
      rejectedAt,
    });

    expect(repository.savedRound).toBeNull();
  });
});
