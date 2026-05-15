import { BetAmount } from "../money/bet-amount.vo";
import { Multiplier } from "../multiplier/multiplier.vo";
import type { BetStatus } from "./bet-status";
import { BetAlreadySettledError, BetDebitNotConfirmedError } from "./round.errors";

export type BetSnapshot = {
  id: string;
  roundId: string;
  userId: string;
  amountCents: bigint;
  status: BetStatus;
  cashoutMultiplierBasisPoints: bigint | null;
  payoutCents: bigint | null;
  placedAt: Date;
  settledAt: Date | null;
};

type BetProps = {
  id: string;
  roundId: string;
  userId: string;
  amount: BetAmount;
  status: BetStatus;
  cashoutMultiplier: Multiplier | null;
  payoutCents: bigint | null;
  placedAt: Date;
  settledAt: Date | null;
};

type CreateBetInput = {
  id?: string;
  roundId: string;
  userId: string;
  amount: BetAmount;
  placedAt: Date;
};

export class Bet {
  private constructor(private props: BetProps) {}

  static create(input: CreateBetInput): Bet {
    return new Bet({
      id: input.id ?? crypto.randomUUID(),
      roundId: input.roundId,
      userId: input.userId,
      amount: input.amount,
      status: "pending_debit",
      cashoutMultiplier: null,
      payoutCents: null,
      placedAt: input.placedAt,
      settledAt: null,
    });
  }

  static rehydrate(snapshot: BetSnapshot): Bet {
    return new Bet({
      id: snapshot.id,
      roundId: snapshot.roundId,
      userId: snapshot.userId,
      amount: BetAmount.fromCents(snapshot.amountCents),
      status: snapshot.status,
      cashoutMultiplier:
        snapshot.cashoutMultiplierBasisPoints === null
          ? null
          : Multiplier.fromBasisPoints(snapshot.cashoutMultiplierBasisPoints),
      payoutCents: snapshot.payoutCents,
      placedAt: snapshot.placedAt,
      settledAt: snapshot.settledAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get roundId(): string {
    return this.props.roundId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get amount(): BetAmount {
    return this.props.amount;
  }

  get status(): BetStatus {
    return this.props.status;
  }

  get cashoutMultiplier(): Multiplier | null {
    return this.props.cashoutMultiplier;
  }

  get payoutCents(): bigint | null {
    return this.props.payoutCents;
  }

  get placedAt(): Date {
    return this.props.placedAt;
  }

  get settledAt(): Date | null {
    return this.props.settledAt;
  }

  confirmDebit(): void {
    if (this.status === "pending_debit") {
      this.props.status = "placed";
    }
  }

  cashOut(multiplier: Multiplier, settledAt: Date): void {
    this.assertConfirmedAndUnsettled();
    this.props.status = "cashed_out";
    this.props.cashoutMultiplier = multiplier;
    this.props.payoutCents = multiplier.calculatePayoutCents(this.amount);
    this.props.settledAt = settledAt;
  }

  markLost(settledAt: Date): void {
    this.assertConfirmedAndUnsettled();
    this.props.status = "lost";
    this.props.settledAt = settledAt;
  }

  reject(settledAt: Date): void {
    if (this.status === "rejected") {
      return;
    }

    if (this.status !== "pending_debit") {
      throw new BetAlreadySettledError();
    }

    this.props.status = "rejected";
    this.props.settledAt = settledAt;
  }

  toSnapshot(): BetSnapshot {
    return {
      id: this.id,
      roundId: this.roundId,
      userId: this.userId,
      amountCents: this.amount.cents,
      status: this.status,
      cashoutMultiplierBasisPoints: this.cashoutMultiplier?.basisPoints ?? null,
      payoutCents: this.payoutCents,
      placedAt: this.placedAt,
      settledAt: this.settledAt,
    };
  }

  private assertConfirmedAndUnsettled(): void {
    if (this.status === "pending_debit") {
      throw new BetDebitNotConfirmedError();
    }

    if (this.status !== "placed") {
      throw new BetAlreadySettledError();
    }
  }
}
