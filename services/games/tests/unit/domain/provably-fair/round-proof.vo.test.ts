import { describe, expect, it } from "bun:test";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { InvalidNonceError, InvalidRoundProofError } from "../../../../src/domain/provably-fair/provably-fair.errors";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";

describe("RoundProof", () => {
  const serverSeedHash = SeedHash.fromHex("09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825");
  const serverSeed = CrashSeed.fromString("server-seed-alpha");
  const clientSeed = CrashSeed.fromString("player-seed-alpha");
  const hmac = "057ce87fd5846bbe4e329c9d2402c6014100b7dad26282f960bd0e97a6a8485f";

  it("creates a proof with committed and revealed seed data", () => {
    const proof = RoundProof.create({
      serverSeedHash,
      serverSeed,
      clientSeed,
      nonce: 0n,
      hmac,
    });

    expect(proof.serverSeedHash.equals(serverSeedHash)).toBe(true);
    expect(proof.serverSeed?.equals(serverSeed)).toBe(true);
    expect(proof.clientSeed.equals(clientSeed)).toBe(true);
    expect(proof.nonce).toBe(0n);
    expect(proof.hmac).toBe(hmac);
  });

  it("rehydrates a proof snapshot", () => {
    const proof = RoundProof.rehydrate({
      serverSeedHash: serverSeedHash.toString(),
      serverSeed: "server-seed-alpha",
      clientSeed: "player-seed-alpha",
      nonce: 7n,
      hmac,
    });

    expect(proof.toSnapshot()).toEqual({
      serverSeedHash: serverSeedHash.toString(),
      serverSeed: "server-seed-alpha",
      clientSeed: "player-seed-alpha",
      nonce: 7n,
      hmac,
    });
  });

  it("supports unrevealed server seed snapshots", () => {
    const proof = RoundProof.create({
      serverSeedHash,
      serverSeed: null,
      clientSeed,
      nonce: 0n,
      hmac,
    });

    expect(proof.toSnapshot().serverSeed).toBeNull();
  });

  it("rejects negative nonces", () => {
    expect(() =>
      RoundProof.create({
        serverSeedHash,
        serverSeed,
        clientSeed,
        nonce: -1n,
        hmac,
      }),
    ).toThrow(InvalidNonceError);
  });

  it("rejects invalid hmac values", () => {
    expect(() =>
      RoundProof.create({
        serverSeedHash,
        serverSeed,
        clientSeed,
        nonce: 0n,
        hmac: "invalid",
      }),
    ).toThrow(InvalidRoundProofError);
  });
});
