import { describe, expect, it } from "bun:test";
import type { RoundRealtimePublisher } from "../../../../src/application/ports/round-realtime.publisher";
import type { RoundHistoryQuery, RoundRepository } from "../../../../src/application/ports/round.repository";
import type {
  RequestWalletCreditCommand,
  RequestWalletDebitCommand,
  WalletEventsPublisher,
} from "../../../../src/application/ports/wallet-events.publisher";
import { HandleWalletDebitedHandler } from "../../../../src/application/use-cases/handle-wallet-debited.handler";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";
import { Round } from "../../../../src/domain/round/round.entity";

class FakeRoundRepository implements RoundRepository {
  round: Round | null = null;
  savedRound: Round | null = null;

  findById(): Promise<Round | null> {
    return Promise.resolve(this.round);
  }

  findCurrent(): Promise<Round | null> {
    return Promise.resolve(null);
  }

  findHistory(_query: RoundHistoryQuery): Promise<Round[]> {
    return Promise.resolve([]);
  }

  save(round: Round): Promise<Round> {
    this.savedRound = round;

    return Promise.resolve(round);
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

class FakeWalletEventsPublisher implements WalletEventsPublisher {
  debitRequests: RequestWalletDebitCommand[] = [];
  creditRequests: RequestWalletCreditCommand[] = [];

  requestDebit(command: RequestWalletDebitCommand): void {
    this.debitRequests.push(command);
  }

  requestCredit(command: RequestWalletCreditCommand): void {
    this.creditRequests.push(command);
  }
}

describe("HandleWalletDebitedHandler", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const debitedAt = new Date("2026-01-01T00:00:01.000Z");

  it("confirms a pending bet after wallet debit succeeds", async () => {
    const repository = new FakeRoundRepository();
    const realtime = new FakeRoundRealtimePublisher();
    const walletEvents = new FakeWalletEventsPublisher();
    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    repository.round = round;
    const handler = new HandleWalletDebitedHandler(repository, realtime, walletEvents);

    await handler.execute({
      walletUserId: "player-id",
      roundId: round.id,
      betId: bet.id,
      amountCents: "1000",
      balanceCents: "9000",
      debitedAt,
    });

    expect(repository.savedRound?.bets.find((savedBet) => savedBet.id === bet.id)?.status).toBe("placed");
    expect(realtime.events).toEqual(["bet.confirmed"]);
    expect(walletEvents.creditRequests).toEqual([]);
  });

  it("does not reprocess an already confirmed bet", async () => {
    const repository = new FakeRoundRepository();
    const realtime = new FakeRoundRealtimePublisher();
    const walletEvents = new FakeWalletEventsPublisher();
    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    round.confirmBetDebit(bet.id);
    repository.round = round;
    const handler = new HandleWalletDebitedHandler(repository, realtime, walletEvents);

    await handler.execute({
      walletUserId: "player-id",
      roundId: round.id,
      betId: bet.id,
      amountCents: "1000",
      balanceCents: "9000",
      debitedAt,
    });

    expect(repository.savedRound).toBeNull();
    expect(realtime.events).toEqual([]);
    expect(walletEvents.creditRequests).toEqual([]);
  });

  it("requests a refund when a late debit arrives for a rejected bet", async () => {
    const repository = new FakeRoundRepository();
    const realtime = new FakeRoundRealtimePublisher();
    const walletEvents = new FakeWalletEventsPublisher();
    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    round.rejectBet(bet.id, debitedAt);
    repository.round = round;
    const handler = new HandleWalletDebitedHandler(repository, realtime, walletEvents);

    await handler.execute({
      walletUserId: "player-id",
      roundId: round.id,
      betId: bet.id,
      amountCents: "1000",
      balanceCents: "9000",
      debitedAt,
    });

    expect(repository.savedRound).toBeNull();
    expect(realtime.events).toEqual([]);
    expect(walletEvents.creditRequests).toEqual([
      {
        walletUserId: "player-id",
        roundId: round.id,
        betId: bet.id,
        amountCents: 1_000n,
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
      now: createdAt,
    });
  }
});
