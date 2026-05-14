import { InvalidSeedHashError } from "./provably-fair.errors";

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export class SeedHash {
  private constructor(private readonly value: string) {}

  static fromHex(value: string): SeedHash {
    const hash = value.trim().toLowerCase();

    if (!SHA256_HEX_PATTERN.test(hash)) {
      throw new InvalidSeedHashError();
    }

    return new SeedHash(hash);
  }

  toString(): string {
    return this.value;
  }

  equals(hash: SeedHash): boolean {
    return this.value === hash.value;
  }
}
