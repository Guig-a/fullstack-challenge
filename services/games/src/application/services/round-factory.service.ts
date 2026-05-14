import { Injectable } from "@nestjs/common";
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
  constructor(private readonly provablyFair: ProvablyFairService) {}

  createNextRound(input: CreateNextRoundInput): Round {
    const serverSeed = CrashSeed.fromString(randomUUID());
    const clientSeed = CrashSeed.fromString(`round:${input.nonce.toString()}`);
    const proof = this.provablyFair.generateCrashPoint({
      serverSeed,
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
}
