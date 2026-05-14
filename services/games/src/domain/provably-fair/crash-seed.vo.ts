import { InvalidCrashSeedError } from "./provably-fair.errors";

export class CrashSeed {
  private constructor(private readonly value: string) {}

  static fromString(value: string): CrashSeed {
    const seed = value.trim();

    if (seed.length === 0) {
      throw new InvalidCrashSeedError();
    }

    return new CrashSeed(seed);
  }

  toString(): string {
    return this.value;
  }

  equals(seed: CrashSeed): boolean {
    return this.value === seed.value;
  }
}
