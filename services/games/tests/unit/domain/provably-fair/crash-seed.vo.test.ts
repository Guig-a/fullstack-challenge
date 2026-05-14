import { describe, expect, it } from "bun:test";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { InvalidCrashSeedError } from "../../../../src/domain/provably-fair/provably-fair.errors";

describe("CrashSeed", () => {
  it("creates a seed from a non-empty string", () => {
    const seed = CrashSeed.fromString("server-seed-alpha");

    expect(seed.toString()).toBe("server-seed-alpha");
  });

  it("rejects empty seeds", () => {
    expect(() => CrashSeed.fromString(" ")).toThrow(InvalidCrashSeedError);
  });
});
