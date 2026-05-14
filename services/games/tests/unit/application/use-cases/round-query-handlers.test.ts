import { describe, expect, it } from "bun:test";
import type { RoundHistoryQuery, RoundRepository } from "../../../../src/application/ports/round.repository";
import { GetCurrentRoundHandler } from "../../../../src/application/use-cases/get-current-round.handler";
import { GetRoundHistoryHandler } from "../../../../src/application/use-cases/get-round-history.handler";
import { GetRoundVerificationHandler } from "../../../../src/application/use-cases/get-round-verification.handler";
import { RoundNotFoundError } from "../../../../src/application/use-cases/round-not-found.error";
import { RoundVerificationUnavailableError } from "../../../../src/application/use-cases/round-verification-unavailable.error";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";
import { Round } from "../../../../src/domain/round/round.entity";

class FakeRoundRepository implements RoundRepository {
  currentRound: Round | null = null;
  roundsById = new Map<string, Round>();
  history: Round[] = [];
  lastHistoryQuery: RoundHistoryQuery | null = null;

  findById(id: string): Promise<Round | null> {
    return Promise.resolve(this.roundsById.get(id) ?? null);
  }

  findCurrent(): Promise<Round | null> {
    return Promise.resolve(this.currentRound);
  }

  findHistory(query: RoundHistoryQuery): Promise<Round[]> {
    this.lastHistoryQuery = query;

    return Promise.resolve(this.history);
  }

  save(round: Round): Promise<Round> {
    return Promise.resolve(round);
  }
}

describe("round query handlers", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const startedAt = new Date("2026-01-01T00:00:10.000Z");
  const crashedAt = new Date("2026-01-01T00:00:15.000Z");

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

  it("returns the current round", async () => {
    const repository = new FakeRoundRepository();
    const round = createRound();
    repository.currentRound = round;

    await expect(new GetCurrentRoundHandler(repository).execute()).resolves.toBe(round);
  });

  it("returns round history using pagination", async () => {
    const repository = new FakeRoundRepository();
    const round = createRound();
    repository.history = [round];
    const handler = new GetRoundHistoryHandler(repository);

    await expect(handler.execute({ limit: 20, offset: 10 })).resolves.toEqual([round]);
    expect(repository.lastHistoryQuery).toEqual({ limit: 20, offset: 10 });
  });

  it("returns verification for crashed rounds", async () => {
    const repository = new FakeRoundRepository();
    const round = createRound();
    round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    round.start(startedAt);
    round.crash(crashedAt);
    repository.roundsById.set(round.id, round);

    await expect(new GetRoundVerificationHandler(repository).execute(round.id)).resolves.toBe(round);
  });

  it("rejects verification for unknown rounds", async () => {
    const repository = new FakeRoundRepository();

    await expect(new GetRoundVerificationHandler(repository).execute("unknown-round")).rejects.toThrow(RoundNotFoundError);
  });

  it("rejects verification before the round crashes", async () => {
    const repository = new FakeRoundRepository();
    const round = createRound();
    repository.roundsById.set(round.id, round);

    await expect(new GetRoundVerificationHandler(repository).execute(round.id)).rejects.toThrow(
      RoundVerificationUnavailableError,
    );
  });
});
