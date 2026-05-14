import { Injectable } from "@nestjs/common";
import { Round } from "../../../domain/round/round.entity";
import type { RoundSnapshot } from "../../../domain/round/round.entity";
import type { BetSnapshot } from "../../../domain/round/bet.entity";
import type { BetStatus } from "../../../domain/round/bet-status";
import type { RoundStatus } from "../../../domain/round/round-status";
import type { RoundRepository } from "../../../application/ports/round.repository";
import type { RoundHistoryQuery } from "../../../application/ports/round.repository";
import { PrismaService } from "../prisma/prisma.service";

type PersistedRound = Awaited<ReturnType<PrismaRoundRepository["findPersistedById"]>>;
type PersistedBet = NonNullable<PersistedRound>["bets"][number];

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Round | null> {
    const round = await this.findPersistedById(id);

    if (!round) {
      return null;
    }

    return this.toDomain(round);
  }

  async findCurrent(): Promise<Round | null> {
    const round = await this.prisma.round.findFirst({
      where: {
        status: {
          in: ["betting", "running"],
        },
      },
      include: {
        bets: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!round) {
      return null;
    }

    return this.toDomain(round);
  }

  async findHistory(query: RoundHistoryQuery): Promise<Round[]> {
    const rounds = await this.prisma.round.findMany({
      where: {
        status: "crashed",
      },
      include: {
        bets: true,
      },
      orderBy: [
        {
          crashedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: query.limit,
      skip: query.offset,
    });

    return rounds.map((round) => this.toDomain(round));
  }

  async save(round: Round): Promise<Round> {
    const snapshot = round.toSnapshot();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.round.upsert({
        where: { id: snapshot.id },
        create: {
          id: snapshot.id,
          status: snapshot.status,
          crashPointBasisPoints: snapshot.crashPointBasisPoints,
          serverSeedHash: snapshot.proof.serverSeedHash,
          serverSeed: snapshot.proof.serverSeed,
          clientSeed: snapshot.proof.clientSeed,
          nonce: snapshot.proof.nonce,
          hmac: snapshot.proof.hmac,
          createdAt: snapshot.createdAt,
          startedAt: snapshot.startedAt,
          crashedAt: snapshot.crashedAt,
        },
        update: {
          status: snapshot.status,
          crashPointBasisPoints: snapshot.crashPointBasisPoints,
          serverSeedHash: snapshot.proof.serverSeedHash,
          serverSeed: snapshot.proof.serverSeed,
          clientSeed: snapshot.proof.clientSeed,
          nonce: snapshot.proof.nonce,
          hmac: snapshot.proof.hmac,
          startedAt: snapshot.startedAt,
          crashedAt: snapshot.crashedAt,
        },
      });

      for (const bet of snapshot.bets) {
        await transaction.bet.upsert({
          where: { id: bet.id },
          create: {
            id: bet.id,
            roundId: bet.roundId,
            userId: bet.userId,
            amountCents: bet.amountCents,
            status: bet.status,
            cashoutMultiplierBasisPoints: bet.cashoutMultiplierBasisPoints,
            payoutCents: bet.payoutCents,
            placedAt: bet.placedAt,
            settledAt: bet.settledAt,
          },
          update: {
            status: bet.status,
            cashoutMultiplierBasisPoints: bet.cashoutMultiplierBasisPoints,
            payoutCents: bet.payoutCents,
            settledAt: bet.settledAt,
          },
        });
      }
    });

    const persistedRound = await this.findPersistedById(snapshot.id);

    if (!persistedRound) {
      throw new Error("Round was not persisted");
    }

    return this.toDomain(persistedRound);
  }

  private findPersistedById(id: string) {
    return this.prisma.round.findUnique({
      where: { id },
      include: {
        bets: true,
      },
    });
  }

  private toDomain(round: NonNullable<PersistedRound>): Round {
    return Round.rehydrate({
      id: round.id,
      status: round.status as RoundStatus,
      crashPointBasisPoints: round.crashPointBasisPoints,
      proof: {
        serverSeedHash: round.serverSeedHash,
        serverSeed: round.serverSeed,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        hmac: round.hmac,
      },
      bets: round.bets.map((bet) => this.toBetSnapshot(bet)),
      createdAt: round.createdAt,
      startedAt: round.startedAt,
      crashedAt: round.crashedAt,
    });
  }

  private toBetSnapshot(bet: PersistedBet): BetSnapshot {
    return {
      id: bet.id,
      roundId: bet.roundId,
      userId: bet.userId,
      amountCents: bet.amountCents,
      status: bet.status as BetStatus,
      cashoutMultiplierBasisPoints: bet.cashoutMultiplierBasisPoints,
      payoutCents: bet.payoutCents,
      placedAt: bet.placedAt,
      settledAt: bet.settledAt,
    };
  }
}
