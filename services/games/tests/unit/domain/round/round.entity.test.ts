import { describe, expect, it } from "bun:test";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { Multiplier } from "../../../../src/domain/multiplier/multiplier.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";
import { Round } from "../../../../src/domain/round/round.entity";
import {
  BetAlreadySettledError,
  BetDebitNotConfirmedError,
  BetNotFoundError,
  DuplicateBetError,
  InvalidRoundTransitionError,
  RoundAlreadyCrashedError,
  RoundNotBettingError,
  RoundNotRunningError,
} from "../../../../src/domain/round/round.errors";

describe("Round", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const startedAt = new Date("2026-01-01T00:00:10.000Z");
  const settledAt = new Date("2026-01-01T00:00:12.000Z");
  const crashedAt = new Date("2026-01-01T00:00:15.000Z");
  const proof = RoundProof.create({
    serverSeedHash: SeedHash.fromHex("09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825"),
    serverSeed: CrashSeed.fromString("server-seed-alpha"),
    clientSeed: CrashSeed.fromString("player-seed-alpha"),
    nonce: 0n,
    hmac: "057ce87fd5846bbe4e329c9d2402c6014100b7dad26282f960bd0e97a6a8485f",
  });

  function createRound(): Round {
    return Round.create({
      id: "round-id",
      crashPoint: CrashPoint.fromBasisPoints(250n),
      proof,
      now: createdAt,
    });
  }

  it("starts in betting state with a deterministic crash point", () => {
    const round = createRound();

    expect(round.id).toBe("round-id");
    expect(round.status).toBe("betting");
    expect(round.crashPoint.basisPoints).toBe(250n);
    expect(round.proof.serverSeedHash.toString()).toBe(
      "09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825",
    );
    expect(round.bets).toHaveLength(0);
    expect(round.createdAt).toBe(createdAt);
  });

  it("registers a valid bet during betting pending wallet debit", () => {
    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);

    expect(bet.userId).toBe("player-id");
    expect(bet.amount.cents).toBe(1_000n);
    expect(bet.status).toBe("pending_debit");
    expect(round.bets).toHaveLength(1);
  });

  it("confirms a bet when wallet debit succeeds", () => {
    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);

    const confirmedBet = round.confirmBetDebit(bet.id);

    expect(confirmedBet.status).toBe("placed");
  });

  it("rejects a second bet from the same player", () => {
    const round = createRound();

    round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);

    expect(() => round.placeBet("player-id", BetAmount.fromCents(2_000n), createdAt)).toThrow(DuplicateBetError);
  });

  it("marks a bet as rejected and allows a new bet from the same player", () => {
    const round = createRound();
    const rejectedBet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);

    round.rejectBet(rejectedBet.id, settledAt);
    const replacementBet = round.placeBet("player-id", BetAmount.fromCents(2_000n), settledAt);

    expect(rejectedBet.status).toBe("rejected");
    expect(rejectedBet.settledAt).toBe(settledAt);
    expect(replacementBet.status).toBe("pending_debit");
    expect(round.bets).toHaveLength(2);
  });

  it("transitions from betting to running", () => {
    const round = createRound();

    round.start(startedAt);

    expect(round.status).toBe("running");
    expect(round.startedAt).toBe(startedAt);
  });

  it("rejects betting after the round starts", () => {
    const round = createRound();

    round.start(startedAt);

    expect(() => round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt)).toThrow(RoundNotBettingError);
  });

  it("rejects cashout before the round starts", () => {
    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);

    round.confirmBetDebit(bet.id);

    expect(() => round.cashOut("player-id", Multiplier.fromBasisPoints(150n), settledAt)).toThrow(RoundNotRunningError);
  });

  it("rejects cashout without a bet", () => {
    const round = createRound();

    round.start(startedAt);

    expect(() => round.cashOut("player-id", Multiplier.fromBasisPoints(150n), settledAt)).toThrow(BetNotFoundError);
  });

  it("cashouts a player bet during running and calculates payout in cents", () => {
    const round = createRound();

    const bet = round.placeBet("player-id", BetAmount.fromCents(1_999n), createdAt);
    round.confirmBetDebit(bet.id);
    round.start(startedAt);
    const cashedOutBet = round.cashOut("player-id", Multiplier.fromBasisPoints(175n), settledAt);

    expect(cashedOutBet.status).toBe("cashed_out");
    expect(cashedOutBet.cashoutMultiplier?.basisPoints).toBe(175n);
    expect(cashedOutBet.payoutCents).toBe(3_498n);
  });

  it("rejects cashout while wallet debit is still pending", () => {
    const round = createRound();

    round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    round.start(startedAt);

    expect(() => round.cashOut("player-id", Multiplier.fromBasisPoints(175n), settledAt)).toThrow(
      BetDebitNotConfirmedError,
    );
  });

  it("rejects duplicated cashout", () => {
    const round = createRound();

    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    round.confirmBetDebit(bet.id);
    round.start(startedAt);
    round.cashOut("player-id", Multiplier.fromBasisPoints(150n), settledAt);

    expect(() => round.cashOut("player-id", Multiplier.fromBasisPoints(175n), settledAt)).toThrow(
      BetAlreadySettledError,
    );
  });

  it("crashes a running round", () => {
    const round = createRound();

    round.start(startedAt);
    round.crash(crashedAt);

    expect(round.status).toBe("crashed");
    expect(round.crashedAt).toBe(crashedAt);
  });

  it("marks confirmed pending bets as lost when the round crashes", () => {
    const round = createRound();

    const lostBet = round.placeBet("lost-player", BetAmount.fromCents(1_000n), createdAt);
    const cashoutBet = round.placeBet("cashout-player", BetAmount.fromCents(2_000n), createdAt);
    round.confirmBetDebit(lostBet.id);
    round.confirmBetDebit(cashoutBet.id);
    round.start(startedAt);
    round.cashOut("cashout-player", Multiplier.fromBasisPoints(150n), settledAt);
    round.crash(crashedAt);

    const bets = round.bets;
    expect(bets.find((bet) => bet.userId === "lost-player")?.status).toBe("lost");
    expect(bets.find((bet) => bet.userId === "cashout-player")?.status).toBe("cashed_out");
  });

  it("rejects debit-pending bets when the round crashes", () => {
    const round = createRound();

    round.placeBet("pending-player", BetAmount.fromCents(1_000n), createdAt);
    round.start(startedAt);
    round.crash(crashedAt);

    expect(round.bets.find((bet) => bet.userId === "pending-player")?.status).toBe("rejected");
  });

  it("rejects cashout after crash", () => {
    const round = createRound();

    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    round.confirmBetDebit(bet.id);
    round.start(startedAt);
    round.crash(crashedAt);

    expect(() => round.cashOut("player-id", Multiplier.fromBasisPoints(150n), settledAt)).toThrow(
      RoundAlreadyCrashedError,
    );
  });

  it("rejects invalid state transitions", () => {
    const round = createRound();

    expect(() => round.crash(crashedAt)).toThrow(InvalidRoundTransitionError);

    round.start(startedAt);

    expect(() => round.start(startedAt)).toThrow(InvalidRoundTransitionError);
  });

  it("rejects betting after crash", () => {
    const round = createRound();

    round.start(startedAt);
    round.crash(crashedAt);

    expect(() => round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt)).toThrow(
      RoundAlreadyCrashedError,
    );
  });

  it("rehydrates persisted round and bet snapshots", () => {
    const round = createRound();

    const lostBet = round.placeBet("lost-player", BetAmount.fromCents(1_000n), createdAt);
    const cashoutBet = round.placeBet("cashout-player", BetAmount.fromCents(2_000n), createdAt);
    round.confirmBetDebit(lostBet.id);
    round.confirmBetDebit(cashoutBet.id);
    round.start(startedAt);
    round.cashOut("cashout-player", Multiplier.fromBasisPoints(150n), settledAt);
    round.crash(crashedAt);

    const rehydratedRound = Round.rehydrate(round.toSnapshot());
    const rehydratedBets = rehydratedRound.bets;

    expect(rehydratedRound.toSnapshot()).toEqual(round.toSnapshot());
    expect(rehydratedRound.proof.serverSeed?.toString()).toBe("server-seed-alpha");
    expect(rehydratedRound.proof.clientSeed.toString()).toBe("player-seed-alpha");
    expect(rehydratedRound.proof.nonce).toBe(0n);
    expect(rehydratedRound.proof.hmac).toBe("057ce87fd5846bbe4e329c9d2402c6014100b7dad26282f960bd0e97a6a8485f");
    expect(rehydratedBets.find((bet) => bet.userId === "lost-player")?.status).toBe("lost");
    expect(rehydratedBets.find((bet) => bet.userId === "cashout-player")?.payoutCents).toBe(3_000n);
  });
});
