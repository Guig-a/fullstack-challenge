import { describe, expect, it } from "bun:test";
import type { ConfigService } from "@nestjs/config";
import type { RoundRealtimePublisher } from "../../../../src/application/ports/round-realtime.publisher";
import type { PlayerBetHistoryQuery, RoundHistoryQuery, RoundRepository } from "../../../../src/application/ports/round.repository";
import { RoundEngineService } from "../../../../src/application/services/round-engine.service";
import type { RoundFactoryService } from "../../../../src/application/services/round-factory.service";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";
import { Bet } from "../../../../src/domain/round/bet.entity";
import { Round } from "../../../../src/domain/round/round.entity";

class FakeRoundRepository implements RoundRepository {
  currentRound: Round | null = null;
  savedRounds: Round[] = [];

  findById(): Promise<Round | null> {
    return Promise.resolve(null);
  }

  findCurrent(): Promise<Round | null> {
    return Promise.resolve(this.currentRound);
  }

  findHistory(_query: RoundHistoryQuery): Promise<Round[]> {
    return Promise.resolve([]);
  }

  findBetsByUserId(_query: PlayerBetHistoryQuery): Promise<Bet[]> {
    return Promise.resolve([]);
  }

  save(round: Round): Promise<Round> {
    this.currentRound = round.status === "crashed" ? this.currentRound : round;
    this.savedRounds.push(round);

    return Promise.resolve(round);
  }
}

class FakeRoundFactory implements Pick<RoundFactoryService, "createNextRound"> {
  createdRounds = 0;

  createNextRound(input: { now: Date; nonce: bigint }): Round {
    this.createdRounds += 1;

    return createRound(`round-${this.createdRounds}`, input.now);
  }
}

class FakeRoundRealtimePublisher implements RoundRealtimePublisher {
  events: string[] = [];

  roundCreated(): void {
    this.events.push("round.created");
  }

  roundStarted(): void {
    this.events.push("round.started");
  }

  roundCrashed(): void {
    this.events.push("round.crashed");
  }

  betPlaced(): void {
    this.events.push("bet.placed");
  }

  betConfirmed(): void {
    this.events.push("bet.confirmed");
  }

  betCashedOut(): void {
    this.events.push("bet.cashed_out");
  }

  betRejected(): void {
    this.events.push("bet.rejected");
  }
}

describe("RoundEngineService", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const later = new Date("2026-01-01T00:00:10.000Z");

  function createEngine(
    repository: FakeRoundRepository,
    factory = new FakeRoundFactory(),
    realtime = new FakeRoundRealtimePublisher(),
  ): RoundEngineService {
    const config = {
      get: (key: string) => (key === "ROUND_BETTING_WINDOW_MS" ? "100000" : undefined),
    } as ConfigService;

    return new RoundEngineService(repository, factory as RoundFactoryService, config, realtime);
  }

  it("creates a betting round when no current round exists", async () => {
    const repository = new FakeRoundRepository();
    const factory = new FakeRoundFactory();
    const realtime = new FakeRoundRealtimePublisher();
    const engine = createEngine(repository, factory, realtime);

    await engine.ensureScheduledRound(now);
    engine.onModuleDestroy();

    expect(factory.createdRounds).toBe(1);
    expect(repository.currentRound?.status).toBe("betting");
    expect(realtime.events).toEqual(["round.created"]);
  });

  it("starts the current betting round", async () => {
    const repository = new FakeRoundRepository();
    repository.currentRound = createRound("round-id", now);
    const realtime = new FakeRoundRealtimePublisher();
    const engine = createEngine(repository, undefined, realtime);

    await engine.startCurrentRound(later);
    engine.onModuleDestroy();

    expect(repository.currentRound?.status).toBe("running");
    expect(repository.currentRound?.startedAt).toBe(later);
    expect(realtime.events).toEqual(["round.started"]);
  });

  it("crashes the current running round and creates the next betting round", async () => {
    const repository = new FakeRoundRepository();
    const runningRound = createRound("running-round", now);
    runningRound.start(now);
    repository.currentRound = runningRound;
    const factory = new FakeRoundFactory();
    const realtime = new FakeRoundRealtimePublisher();
    const engine = createEngine(repository, factory, realtime);

    await engine.crashCurrentRound(later);
    engine.onModuleDestroy();

    expect(runningRound.status).toBe("crashed");
    expect(runningRound.crashedAt).toBe(later);
    expect(factory.createdRounds).toBe(1);
    expect(repository.currentRound?.status).toBe("betting");
    expect(realtime.events).toEqual(["round.crashed", "round.created"]);
  });

  it("calculates crash delay from crash point basis points", () => {
    const engine = createEngine(new FakeRoundRepository());

    expect(engine.getCrashDelayMs(100n)).toBe(0);
    expect(engine.getCrashDelayMs(150n)).toBe(5_000);
    expect(engine.getCrashDelayMs(250n)).toBe(15_000);
    engine.onModuleDestroy();
  });
});

function createRound(id: string, createdAt: Date): Round {
  return Round.create({
    id,
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
