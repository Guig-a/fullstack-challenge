import { InsufficientFundsError, InvalidMoneyAmountError } from "./wallet.errors";

export class Money {
  private constructor(private readonly centsValue: bigint) {}

  static zero(): Money {
    return new Money(0n);
  }

  static fromCents(cents: bigint): Money {
    if (cents < 0n) {
      throw new InvalidMoneyAmountError();
    }

    return new Money(cents);
  }

  get cents(): bigint {
    return this.centsValue;
  }

  add(amount: Money): Money {
    return new Money(this.centsValue + amount.centsValue);
  }

  subtract(amount: Money): Money {
    const result = this.centsValue - amount.centsValue;

    if (result < 0n) {
      throw new InsufficientFundsError();
    }

    return new Money(result);
  }

  isZero(): boolean {
    return this.centsValue === 0n;
  }

  equals(amount: Money): boolean {
    return this.centsValue === amount.centsValue;
  }

  toDecimalString(): string {
    const units = this.centsValue / 100n;
    const cents = this.centsValue % 100n;

    return `${units}.${cents.toString().padStart(2, "0")}`;
  }
}
