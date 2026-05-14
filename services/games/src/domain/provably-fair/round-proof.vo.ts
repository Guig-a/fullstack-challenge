import { CrashSeed } from "./crash-seed.vo";
import { InvalidNonceError, InvalidRoundProofError } from "./provably-fair.errors";
import { SeedHash } from "./seed-hash.vo";

const HMAC_SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export type RoundProofSnapshot = {
  serverSeedHash: string;
  serverSeed: string | null;
  clientSeed: string;
  nonce: bigint;
  hmac: string;
};

type RoundProofProps = {
  serverSeedHash: SeedHash;
  serverSeed: CrashSeed | null;
  clientSeed: CrashSeed;
  nonce: bigint;
  hmac: string;
};

export class RoundProof {
  private constructor(private readonly props: RoundProofProps) {}

  static create(props: RoundProofProps): RoundProof {
    RoundProof.assertValidNonce(props.nonce);
    RoundProof.assertValidHmac(props.hmac);

    return new RoundProof({
      ...props,
      hmac: props.hmac.toLowerCase(),
    });
  }

  static rehydrate(snapshot: RoundProofSnapshot): RoundProof {
    return RoundProof.create({
      serverSeedHash: SeedHash.fromHex(snapshot.serverSeedHash),
      serverSeed: snapshot.serverSeed === null ? null : CrashSeed.fromString(snapshot.serverSeed),
      clientSeed: CrashSeed.fromString(snapshot.clientSeed),
      nonce: snapshot.nonce,
      hmac: snapshot.hmac,
    });
  }

  get serverSeedHash(): SeedHash {
    return this.props.serverSeedHash;
  }

  get serverSeed(): CrashSeed | null {
    return this.props.serverSeed;
  }

  get clientSeed(): CrashSeed {
    return this.props.clientSeed;
  }

  get nonce(): bigint {
    return this.props.nonce;
  }

  get hmac(): string {
    return this.props.hmac;
  }

  revealServerSeed(serverSeed: CrashSeed): RoundProof {
    return RoundProof.create({
      ...this.props,
      serverSeed,
    });
  }

  toSnapshot(): RoundProofSnapshot {
    return {
      serverSeedHash: this.serverSeedHash.toString(),
      serverSeed: this.serverSeed?.toString() ?? null,
      clientSeed: this.clientSeed.toString(),
      nonce: this.nonce,
      hmac: this.hmac,
    };
  }

  private static assertValidNonce(nonce: bigint): void {
    if (nonce < 0n) {
      throw new InvalidNonceError();
    }
  }

  private static assertValidHmac(hmac: string): void {
    if (!HMAC_SHA256_HEX_PATTERN.test(hmac.toLowerCase())) {
      throw new InvalidRoundProofError();
    }
  }
}
