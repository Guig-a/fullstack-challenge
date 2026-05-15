import { describe, expect, it } from "bun:test";
import type { ConfigService } from "@nestjs/config";
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

  it("can bound generated crash points for deterministic E2E windows", () => {
    const config = {
      get: (key: string) => {
        if (key === "ROUND_MIN_CRASH_POINT_BASIS_POINTS") {
          return "130";
        }

        if (key === "ROUND_MAX_CRASH_POINT_BASIS_POINTS") {
          return "150";
        }

        return undefined;
      },
    } as ConfigService;
    const factory = new RoundFactoryService(new ProvablyFairService(), config);

    const round = factory.createNextRound({
      now: new Date("2026-01-01T00:00:00.000Z"),
      nonce: 42n,
    });

    expect(round.crashPoint.basisPoints).toBeGreaterThanOrEqual(130n);
    expect(round.crashPoint.basisPoints).toBeLessThanOrEqual(150n);
  });
});
