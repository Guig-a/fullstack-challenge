import { BetAmount } from "../money/bet-amount.vo";
import { CrashPoint } from "../multiplier/crash-point.vo";
import { Multiplier } from "../multiplier/multiplier.vo";
import { Bet } from "./bet.entity";
import type { BetSnapshot } from "./bet.entity";
import type { RoundStatus } from "./round-status";
import {
  BetNotFoundError,
  DuplicateBetError,
  InvalidRoundTransitionError,
  RoundAlreadyCrashedError,
  RoundNotBettingError,
  RoundNotRunningError,
} from "./round.errors";

export type RoundSnapshot = {
  id: string;
  status: RoundStatus;
  crashPointBasisPoints: bigint;
  bets: BetSnapshot[];
  createdAt: Date;
  startedAt: Date | null;
  crashedAt: Date | null;
};

type RoundProps = {
  id: string;
  status: RoundStatus;
  crashPoint: CrashPoint;
  bets: Bet[];
  createdAt: Date;
  startedAt: Date | null;
  crashedAt: Date | null;
};

type CreateRoundInput = {
  id?: string;
  crashPoint: CrashPoint;
  now: Date;
};

export class Round {
  private constructor(private props: RoundProps) {}

  static create(input: CreateRoundInput): Round {
    return new Round({
      id: input.id ?? crypto.randomUUID(),
      status: "betting",
      crashPoint: input.crashPoint,
      bets: [],
      createdAt: input.now,
      startedAt: null,
      crashedAt: null,
    });
  }

  static rehydrate(snapshot: RoundSnapshot): Round {
    return new Round({
      id: snapshot.id,
      status: snapshot.status,
      crashPoint: CrashPoint.fromBasisPoints(snapshot.crashPointBasisPoints),
      bets: snapshot.bets.map((bet) => Bet.rehydrate(bet)),
      createdAt: snapshot.createdAt,
      startedAt: snapshot.startedAt,
      crashedAt: snapshot.crashedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get status(): RoundStatus {
    return this.props.status;
  }

  get crashPoint(): CrashPoint {
    return this.props.crashPoint;
  }

  get bets(): readonly Bet[] {
    return [...this.props.bets];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get crashedAt(): Date | null {
    return this.props.crashedAt;
  }

  placeBet(userId: string, amount: BetAmount, placedAt: Date): Bet {
    this.assertBetting();

    if (this.findBetByUserId(userId)) {
      throw new DuplicateBetError();
    }

    const bet = Bet.create({
      roundId: this.id,
      userId,
      amount,
      placedAt,
    });

    this.props.bets.push(bet);

    return bet;
  }

  start(startedAt: Date): void {
    if (this.status === "crashed") {
      throw new RoundAlreadyCrashedError();
    }

    if (this.status !== "betting") {
      throw new InvalidRoundTransitionError();
    }

    this.props.status = "running";
    this.props.startedAt = startedAt;
  }

  cashOut(userId: string, multiplier: Multiplier, settledAt: Date): Bet {
    this.assertRunning();

    const bet = this.findBetByUserId(userId);

    if (!bet) {
      throw new BetNotFoundError();
    }

    bet.cashOut(multiplier, settledAt);

    return bet;
  }

  crash(crashedAt: Date): void {
    if (this.status === "crashed") {
      throw new RoundAlreadyCrashedError();
    }

    if (this.status !== "running") {
      throw new InvalidRoundTransitionError();
    }

    for (const bet of this.props.bets) {
      if (bet.status === "placed") {
        bet.markLost(crashedAt);
      }
    }

    this.props.status = "crashed";
    this.props.crashedAt = crashedAt;
  }

  toSnapshot(): RoundSnapshot {
    return {
      id: this.id,
      status: this.status,
      crashPointBasisPoints: this.crashPoint.basisPoints,
      bets: this.props.bets.map((bet) => bet.toSnapshot()),
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      crashedAt: this.crashedAt,
    };
  }

  private findBetByUserId(userId: string): Bet | undefined {
    return this.props.bets.find((bet) => bet.userId === userId);
  }

  private assertBetting(): void {
    if (this.status === "crashed") {
      throw new RoundAlreadyCrashedError();
    }

    if (this.status !== "betting") {
      throw new RoundNotBettingError();
    }
  }

  private assertRunning(): void {
    if (this.status === "crashed") {
      throw new RoundAlreadyCrashedError();
    }

    if (this.status !== "running") {
      throw new RoundNotRunningError();
    }
  }
}
