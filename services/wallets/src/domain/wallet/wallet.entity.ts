import { Money } from "./money.vo";
import { InvalidWalletOwnerError } from "./wallet.errors";

export type WalletSnapshot = {
  id: string;
  userId: string;
  balanceCents: bigint;
  createdAt: Date;
  updatedAt: Date;
};

type WalletProps = {
  id: string;
  userId: string;
  balance: Money;
  createdAt: Date;
  updatedAt: Date;
};

export class Wallet {
  private constructor(private props: WalletProps) {}

  static create(userId: string): Wallet {
    Wallet.assertValidUserId(userId);

    const now = new Date();

    return new Wallet({
      id: crypto.randomUUID(),
      userId,
      balance: Money.zero(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(snapshot: WalletSnapshot): Wallet {
    Wallet.assertValidUserId(snapshot.userId);

    return new Wallet({
      id: snapshot.id,
      userId: snapshot.userId,
      balance: Money.fromCents(snapshot.balanceCents),
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get balance(): Money {
    return this.props.balance;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  credit(amount: Money): void {
    this.props.balance = this.props.balance.add(amount);
    this.touch();
  }

  debit(amount: Money): void {
    this.props.balance = this.props.balance.subtract(amount);
    this.touch();
  }

  toSnapshot(): WalletSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      balanceCents: this.balance.cents,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  private static assertValidUserId(userId: string): void {
    if (userId.trim().length === 0) {
      throw new InvalidWalletOwnerError();
    }
  }
}
