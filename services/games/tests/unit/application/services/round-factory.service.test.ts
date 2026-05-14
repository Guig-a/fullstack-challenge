import { describe, expect, it } from "bun:test";
import { ProvablyFairService } from "../../../../src/domain/provably-fair/provably-fair.service";
import { RoundFactoryService } from "../../../../src/application/services/round-factory.service";

describe("RoundFactoryService", () => {
  it("creates betting rounds with provably fair proof", () => {
    const factory = new RoundFactoryService(new ProvablyFairService());
    const round = factory.createNextRound({
      now: new Date("2026-01-01T00:00:00.000Z"),
      nonce: 42n,
    });

    expect(round.status).toBe("betting");
    expect(round.proof.nonce).toBe(42n);
    expect(round.proof.serverSeed).not.toBeNull();
    expect(round.proof.clientSeed.toString()).toBe("round:42");
    expect(round.proof.hmac).toHaveLength(64);
    expect(round.crashPoint.basisPoints).toBeGreaterThanOrEqual(100n);
  });
});
