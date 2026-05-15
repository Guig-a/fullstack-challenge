import { describe, expect, it } from "bun:test";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";
import { Round } from "../../../../src/domain/round/round.entity";
import { RoundsGateway } from "../../../../src/presentation/gateways/rounds.gateway";

type EmittedEvent = {
  event: string;
  payload: unknown;
};

describe("RoundsGateway", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("emits round payloads with JSON-safe values", () => {
    const emittedEvents: EmittedEvent[] = [];
    const gateway = new RoundsGateway();
    Object.assign(gateway, {
      server: {
        emit: (event: string, payload: unknown) => emittedEvents.push({ event, payload }),
      },
    });

    const round = createRound();
    gateway.roundCreated(round);

    expect(emittedEvents).toEqual([
      {
        event: "round.created",
        payload: {
          round: {
            id: "round-id",
            status: "betting",
            crashPointBasisPoints: "250",
            proof: {
              serverSeedHash: "09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825",
              serverSeed: null,
              clientSeed: "player-seed-alpha",
              nonce: "0",
              hmac: "057ce87fd5846bbe4e329c9d2402c6014100b7dad26282f960bd0e97a6a8485f",
            },
            bets: [],
            createdAt: now.toISOString(),
            startedAt: null,
            crashedAt: null,
          },
        },
      },
    ]);
  });

  it("emits bet payloads with cents serialized as strings", () => {
    const emittedEvents: EmittedEvent[] = [];
    const gateway = new RoundsGateway();
    Object.assign(gateway, {
      server: {
        emit: (event: string, payload: unknown) => emittedEvents.push({ event, payload }),
      },
    });

    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), now);
    gateway.betPlaced(round, bet);

    expect(emittedEvents).toEqual([
      {
        event: "bet.placed",
        payload: {
          roundId: "round-id",
          bet: {
            id: bet.id,
            roundId: "round-id",
            userId: "player-id",
            amountCents: "1000",
            status: "pending_debit",
            cashoutMultiplierBasisPoints: null,
            payoutCents: null,
            placedAt: now.toISOString(),
            settledAt: null,
          },
        },
      },
    ]);
  });

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
      now,
    });
  }
});
