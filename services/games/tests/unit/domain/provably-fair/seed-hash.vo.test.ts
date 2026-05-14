import { describe, expect, it } from "bun:test";
import { InvalidSeedHashError } from "../../../../src/domain/provably-fair/provably-fair.errors";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";

describe("SeedHash", () => {
  it("creates a seed hash from a SHA-256 hex digest", () => {
    const hash = SeedHash.fromHex("09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825");

    expect(hash.toString()).toBe("09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825");
  });

  it("normalizes uppercase hashes", () => {
    const hash = SeedHash.fromHex("09D012319A4C4398FDC06A09296A127064401ABEFD0084E37622E48E28678825");

    expect(hash.toString()).toBe("09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825");
  });

  it("rejects invalid seed hashes", () => {
    expect(() => SeedHash.fromHex("invalid")).toThrow(InvalidSeedHashError);
  });
});
