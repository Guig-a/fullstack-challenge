import { BetAmount } from "../money/bet-amount.vo";
import { InvalidMultiplierError } from "../round/round.errors";

export class Multiplier {
  static readonly MIN_BASIS_POINTS = 100n;

  private constructor(private readonly basisPointsValue: bigint) {}

  static fromBasisPoints(basisPoints: bigint): Multiplier {
    if (basisPoints < Multiplier.MIN_BASIS_POINTS) {
      throw new InvalidMultiplierError();
    }

    return new Multiplier(basisPoints);
  }

  get basisPoints(): bigint {
    return this.basisPointsValue;
  }

  calculatePayoutCents(amount: BetAmount): bigint {
    return (amount.cents * this.basisPointsValue) / 100n;
  }

  equals(multiplier: Multiplier): boolean {
    return this.basisPointsValue === multiplier.basisPointsValue;
  }

  toDecimalString(): string {
    const units = this.basisPointsValue / 100n;
    const cents = this.basisPointsValue % 100n;

    return `${units}.${cents.toString().padStart(2, "0")}x`;
  }
}
