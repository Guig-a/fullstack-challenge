import { Round } from "../../domain/round/round.entity";

export class RoundProofResponseDto {
  serverSeedHash!: string;
  serverSeed!: string | null;
  clientSeed!: string;
  nonce!: string;
  hmac!: string;

  static fromDomain(round: Round): RoundProofResponseDto {
    const proof = round.proof;
    const canRevealServerSeed = round.status === "crashed";

    return {
      serverSeedHash: proof.serverSeedHash.toString(),
      serverSeed: canRevealServerSeed ? proof.serverSeed?.toString() ?? null : null,
      clientSeed: proof.clientSeed.toString(),
      nonce: proof.nonce.toString(),
      hmac: proof.hmac,
    };
  }
}
