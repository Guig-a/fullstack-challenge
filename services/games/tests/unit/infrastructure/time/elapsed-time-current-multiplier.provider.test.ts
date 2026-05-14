import { describe, expect, it } from "bun:test";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";
import { Round } from "../../../../src/domain/round/round.entity";
import { ElapsedTimeCurrentMultiplierProvider } from "../../../../src/infrastructure/time/elapsed-time-current-multiplier.provider";

describe("ElapsedTimeCurrentMultiplierProvider", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const provider = new ElapsedTimeCurrentMultiplierProvider();

  function createRound(crashPointBasisPoints = 250n): Round {
    return Round.create({
      id: "round-id",
      crashPoint: CrashPoint.fromBasisPoints(crashPointBasisPoints),
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

  it("returns 1.00x before the round starts", () => {
    const round = createRound();

    expect(provider.getCurrentMultiplier(round, createdAt).basisPoints).toBe(100n);
  });

  it("calculates multiplier from elapsed running time", () => {
    const round = createRound();
    round.start(createdAt);

    expect(provider.getCurrentMultiplier(round, new Date("2026-01-01T00:00:05.000Z")).basisPoints).toBe(150n);
  });

  it("caps multiplier before the crash point", () => {
    const round = createRound(150n);
    round.start(createdAt);

    expect(provider.getCurrentMultiplier(round, new Date("2026-01-01T00:01:00.000Z")).basisPoints).toBe(149n);
  });
});
