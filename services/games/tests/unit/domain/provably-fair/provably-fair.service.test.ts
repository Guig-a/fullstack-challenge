import { describe, expect, it } from "bun:test";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { InvalidNonceError } from "../../../../src/domain/provably-fair/provably-fair.errors";
import { ProvablyFairService } from "../../../../src/domain/provably-fair/provably-fair.service";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";

describe("ProvablyFairService", () => {
  const service = new ProvablyFairService();
  const serverSeed = CrashSeed.fromString("server-seed-alpha");
  const clientSeed = CrashSeed.fromString("player-seed-alpha");

  it("hashes the server seed before the round is played", () => {
    const hash = service.hashSeed(serverSeed);

    expect(hash.toString()).toBe("09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825");
  });

  it("generates a deterministic crash point from server seed, client seed and nonce", () => {
    const proof = service.generateCrashPoint({
      serverSeed,
      clientSeed,
      nonce: 0n,
    });

    expect(proof.serverSeedHash.toString()).toBe(
      "09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825",
    );
    expect(proof.hmac).toBe("057ce87fd5846bbe4e329c9d2402c6014100b7dad26282f960bd0e97a6a8485f");
    expect(proof.crashPoint.basisPoints).toBe(102n);
    expect(proof.crashPoint.toDecimalString()).toBe("1.02x");
  });

  it("generates the same crash point for the same inputs", () => {
    const firstProof = service.generateCrashPoint({ serverSeed, clientSeed, nonce: 7n });
    const secondProof = service.generateCrashPoint({ serverSeed, clientSeed, nonce: 7n });

    expect(firstProof.hmac).toBe(secondProof.hmac);
    expect(firstProof.crashPoint.equals(secondProof.crashPoint)).toBe(true);
  });

  it("generates a different result when the server seed changes", () => {
    const firstProof = service.generateCrashPoint({ serverSeed, clientSeed, nonce: 0n });
    const secondProof = service.generateCrashPoint({
      serverSeed: CrashSeed.fromString("server-seed-beta"),
      clientSeed,
      nonce: 0n,
    });

    expect(firstProof.hmac).not.toBe(secondProof.hmac);
    expect(firstProof.crashPoint.equals(secondProof.crashPoint)).toBe(false);
    expect(secondProof.hmac).toBe("042dd345132db90d233d4be7f7f08aab140b79b4225a6d6217bf92bcc5bbd56a");
    expect(secondProof.crashPoint.basisPoints).toBe(101n);
  });

  it("verifies a crash point using the revealed server seed", () => {
    const proof = service.generateCrashPoint({ serverSeed, clientSeed, nonce: 0n });

    expect(
      service.verifyCrashPoint({
        serverSeed,
        clientSeed,
        nonce: 0n,
        serverSeedHash: proof.serverSeedHash,
        crashPoint: proof.crashPoint,
      }),
    ).toBe(true);
  });

  it("rejects verification when the expected crash point was changed", () => {
    const proof = service.generateCrashPoint({ serverSeed, clientSeed, nonce: 0n });

    expect(
      service.verifyCrashPoint({
        serverSeed,
        clientSeed,
        nonce: 0n,
        serverSeedHash: proof.serverSeedHash,
        crashPoint: CrashPoint.fromBasisPoints(200n),
      }),
    ).toBe(false);
  });

  it("rejects verification when the expected server seed hash was changed", () => {
    const proof = service.generateCrashPoint({ serverSeed, clientSeed, nonce: 0n });

    expect(
      service.verifyCrashPoint({
        serverSeed,
        clientSeed,
        nonce: 0n,
        serverSeedHash: SeedHash.fromHex("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
        crashPoint: proof.crashPoint,
      }),
    ).toBe(false);
  });

  it("keeps instant crash outcomes at 1.00x", () => {
    const proof = service.generateCrashPoint({
      serverSeed: CrashSeed.fromString("seed-27"),
      clientSeed,
      nonce: 0n,
    });

    expect(proof.hmac).toBe("65e216a18b2e11dce1b9ac4e5d3b7d9a3aab95b73d34e52211d843631ad87bf1");
    expect(proof.crashPoint.basisPoints).toBe(100n);
    expect(proof.crashPoint.toDecimalString()).toBe("1.00x");
  });

  it("rejects negative nonces", () => {
    expect(() => service.generateCrashPoint({ serverSeed, clientSeed, nonce: -1n })).toThrow(InvalidNonceError);
  });
});
