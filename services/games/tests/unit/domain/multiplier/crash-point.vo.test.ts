import { describe, expect, it } from "bun:test";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { InvalidMultiplierError } from "../../../../src/domain/round/round.errors";

describe("CrashPoint", () => {
  it("creates a deterministic crash point from basis points", () => {
    const crashPoint = CrashPoint.fromBasisPoints(150n);

    expect(crashPoint.basisPoints).toBe(150n);
    expect(crashPoint.toDecimalString()).toBe("1.50x");
  });

  it("rejects crash points below 1.00x", () => {
    expect(() => CrashPoint.fromBasisPoints(99n)).toThrow(InvalidMultiplierError);
  });
});
