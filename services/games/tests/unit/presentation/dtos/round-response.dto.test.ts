import { describe, expect, it } from "bun:test";
import { BetAmount } from "../../../../src/domain/money/bet-amount.vo";
import { CrashPoint } from "../../../../src/domain/multiplier/crash-point.vo";
import { CrashSeed } from "../../../../src/domain/provably-fair/crash-seed.vo";
import { RoundProof } from "../../../../src/domain/provably-fair/round-proof.vo";
import { SeedHash } from "../../../../src/domain/provably-fair/seed-hash.vo";
import { Round } from "../../../../src/domain/round/round.entity";
import { PlayerBetHistoryResponseDto } from "../../../../src/presentation/dtos/player-bet-history-response.dto";
import { RoundHistoryResponseDto } from "../../../../src/presentation/dtos/round-history-response.dto";
import { RoundResponseDto } from "../../../../src/presentation/dtos/round-response.dto";

describe("RoundResponseDto", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const startedAt = new Date("2026-01-01T00:00:10.000Z");
  const crashedAt = new Date("2026-01-01T00:00:15.000Z");

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

  it("serializes bigint fields as strings and hides server seed before crash", () => {
    const round = createRound();
    round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    const response = RoundResponseDto.fromDomain(round);

    expect(response.crashPointBasisPoints).toBe("250");
    expect(response.proof.serverSeedHash).toBe("09d012319a4c4398fdc06a09296a127064401abefd0084e37622e48e28678825");
    expect(response.proof.serverSeed).toBeNull();
    expect(response.proof.nonce).toBe("0");
    expect(response.bets[0]?.amountCents).toBe("1000");
    expect(response.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("reveals server seed after crash", () => {
    const round = createRound();
    round.start(startedAt);
    round.crash(crashedAt);
    const response = RoundResponseDto.fromDomain(round);

    expect(response.status).toBe("crashed");
    expect(response.proof.serverSeed).toBe("server-seed-alpha");
    expect(response.crashedAt).toBe("2026-01-01T00:00:15.000Z");
  });

  it("serializes history pagination", () => {
    const round = createRound();
    const response = RoundHistoryResponseDto.fromDomain([round], { limit: 20, offset: 10 });

    expect(response.limit).toBe(20);
    expect(response.offset).toBe(10);
    expect(response.items).toHaveLength(1);
  });

  it("serializes player bet history pagination", () => {
    const round = createRound();
    const bet = round.placeBet("player-id", BetAmount.fromCents(1_000n), createdAt);
    const response = PlayerBetHistoryResponseDto.fromDomain([bet], { limit: 20, offset: 10 });

    expect(response.limit).toBe(20);
    expect(response.offset).toBe(10);
    expect(response.items).toHaveLength(1);
    expect(response.items[0]?.userId).toBe("player-id");
    expect(response.items[0]?.amountCents).toBe("1000");
  });
});
