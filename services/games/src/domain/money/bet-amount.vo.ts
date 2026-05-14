import { InvalidBetAmountError } from "../round/round.errors";

export class BetAmount {
  static readonly MIN_CENTS = 100n;
  static readonly MAX_CENTS = 100_000n;

  private constructor(private readonly centsValue: bigint) {}

  static fromCents(cents: bigint): BetAmount {
    if (cents < BetAmount.MIN_CENTS || cents > BetAmount.MAX_CENTS) {
      throw new InvalidBetAmountError();
    }

    return new BetAmount(cents);
  }

  get cents(): bigint {
    return this.centsValue;
  }

  equals(amount: BetAmount): boolean {
    return this.centsValue === amount.centsValue;
  }

  toDecimalString(): string {
    const units = this.centsValue / 100n;
    const cents = this.centsValue % 100n;

    return `${units}.${cents.toString().padStart(2, "0")}`;
  }
}
