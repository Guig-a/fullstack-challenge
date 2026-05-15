import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { CrashSeed } from "../../domain/provably-fair/crash-seed.vo";
import { ProvablyFairService } from "../../domain/provably-fair/provably-fair.service";
import { RoundProof } from "../../domain/provably-fair/round-proof.vo";
import { Round } from "../../domain/round/round.entity";

export type CreateNextRoundInput = {
  now: Date;
  nonce: bigint;
};

@Injectable()
export class RoundFactoryService {
  constructor(
    private readonly provablyFair: ProvablyFairService,
    private readonly config?: ConfigService,
  ) {}

  createNextRound(input: CreateNextRoundInput): Round {
    const clientSeed = CrashSeed.fromString(`round:${input.nonce.toString()}`);
    const { serverSeed, proof } = this.generateProof({
      clientSeed,
      nonce: input.nonce,
    });

    return Round.create({
      crashPoint: proof.crashPoint,
      proof: RoundProof.create({
        serverSeedHash: proof.serverSeedHash,
        serverSeed,
        clientSeed,
        nonce: input.nonce,
        hmac: proof.hmac,
      }),
      now: input.now,
    });
  }

  private generateProof(input: { clientSeed: CrashSeed; nonce: bigint }) {
    const minCrashPointBasisPoints = this.getCrashPointBasisPointsConfig("ROUND_MIN_CRASH_POINT_BASIS_POINTS");
    const maxCrashPointBasisPoints = this.getCrashPointBasisPointsConfig("ROUND_MAX_CRASH_POINT_BASIS_POINTS");

    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const serverSeed = CrashSeed.fromString(randomUUID());
      const proof = this.provablyFair.generateCrashPoint({
        serverSeed,
        clientSeed: input.clientSeed,
        nonce: input.nonce,
      });

      const isAboveMinimum = !minCrashPointBasisPoints || proof.crashPoint.basisPoints >= minCrashPointBasisPoints;
      const isBelowMaximum = !maxCrashPointBasisPoints || proof.crashPoint.basisPoints <= maxCrashPointBasisPoints;

      if (isAboveMinimum && isBelowMaximum) {
        return { serverSeed, proof };
      }
    }

    throw new Error("Unable to generate a round within configured crash point bounds");
  }

  private getCrashPointBasisPointsConfig(key: string): bigint | null {
    const value = this.config?.get<string>(key);

    if (!value) {
      return null;
    }

    if (!/^\d+$/.test(value)) {
      throw new Error(`${key} must be an integer string`);
    }

    const basisPoints = BigInt(value);

    return basisPoints <= 100n ? null : basisPoints;
  }
}
