import { createHash, createHmac } from "node:crypto";
import { CrashPoint } from "../multiplier/crash-point.vo";
import { CrashSeed } from "./crash-seed.vo";
import { InvalidNonceError } from "./provably-fair.errors";
import { SeedHash } from "./seed-hash.vo";

const HMAC_SIGNIFICANT_HEX_CHARS = 13;
const HMAC_RANGE = 2n ** 52n;
const INSTANT_CRASH_MODULO = 33n;

export type CrashPointProof = {
  serverSeedHash: SeedHash;
  hmac: string;
  crashPoint: CrashPoint;
};

export type GenerateCrashPointInput = {
  serverSeed: CrashSeed;
  clientSeed: CrashSeed;
  nonce: bigint;
};

export type VerifyCrashPointInput = GenerateCrashPointInput & {
  serverSeedHash: SeedHash;
  crashPoint: CrashPoint;
};

export class ProvablyFairService {
  generateCrashPoint(input: GenerateCrashPointInput): CrashPointProof {
    this.assertValidNonce(input.nonce);

    const hmac = this.createRoundHmac(input);

    return {
      serverSeedHash: this.hashSeed(input.serverSeed),
      hmac,
      crashPoint: this.calculateCrashPointFromHmac(hmac),
    };
  }

  verifyCrashPoint(input: VerifyCrashPointInput): boolean {
    const proof = this.generateCrashPoint(input);

    return proof.serverSeedHash.equals(input.serverSeedHash) && proof.crashPoint.equals(input.crashPoint);
  }

  hashSeed(seed: CrashSeed): SeedHash {
    return SeedHash.fromHex(createHash("sha256").update(seed.toString()).digest("hex"));
  }

  private createRoundHmac(input: GenerateCrashPointInput): string {
    return createHmac("sha256", input.serverSeed.toString())
      .update(`${input.clientSeed.toString()}:${input.nonce.toString()}`)
      .digest("hex");
  }

  private calculateCrashPointFromHmac(hmac: string): CrashPoint {
    const significantHex = hmac.slice(0, HMAC_SIGNIFICANT_HEX_CHARS);
    const hmacValue = BigInt(`0x${significantHex}`);

    if (hmacValue % INSTANT_CRASH_MODULO === 0n) {
      return CrashPoint.fromBasisPoints(100n);
    }

    const numerator = 100n * HMAC_RANGE - hmacValue;
    const denominator = HMAC_RANGE - hmacValue;
    const basisPoints = numerator / denominator;

    return CrashPoint.fromBasisPoints(basisPoints);
  }

  private assertValidNonce(nonce: bigint): void {
    if (nonce < 0n) {
      throw new InvalidNonceError();
    }
  }
}
