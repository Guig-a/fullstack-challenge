import { Multiplier } from "./multiplier.vo";

export class CrashPoint {
  private constructor(private readonly multiplier: Multiplier) {}

  static fromBasisPoints(basisPoints: bigint): CrashPoint {
    return new CrashPoint(Multiplier.fromBasisPoints(basisPoints));
  }

  get basisPoints(): bigint {
    return this.multiplier.basisPoints;
  }

  toMultiplier(): Multiplier {
    return Multiplier.fromBasisPoints(this.basisPoints);
  }

  equals(crashPoint: CrashPoint): boolean {
    return this.basisPoints === crashPoint.basisPoints;
  }

  toDecimalString(): string {
    return this.multiplier.toDecimalString();
  }
}
