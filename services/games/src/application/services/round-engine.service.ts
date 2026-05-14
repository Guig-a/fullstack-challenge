import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ROUND_REALTIME_PUBLISHER } from "../ports/round-realtime.publisher";
import type { RoundRealtimePublisher } from "../ports/round-realtime.publisher";
import { ROUND_REPOSITORY } from "../ports/round.repository";
import type { RoundRepository } from "../ports/round.repository";
import { RoundFactoryService } from "./round-factory.service";

const DEFAULT_BETTING_WINDOW_MS = 10_000;
const BASIS_POINTS_PER_SECOND = 10n;
const INITIAL_MULTIPLIER_BASIS_POINTS = 100n;

@Injectable()
export class RoundEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoundEngineService.name);
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
    private readonly roundFactory: RoundFactoryService,
    private readonly config: ConfigService,
    @Inject(ROUND_REALTIME_PUBLISHER)
    private readonly realtime: RoundRealtimePublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureScheduledRound();
  }

  onModuleDestroy(): void {
    this.clearTimer();
  }

  async ensureScheduledRound(now = new Date()): Promise<void> {
    const currentRound = await this.rounds.findCurrent();

    if (!currentRound) {
      const round = this.roundFactory.createNextRound({
        now,
        nonce: BigInt(now.getTime()),
      });
      await this.rounds.save(round);
      this.realtime.roundCreated(round);
      this.scheduleRoundStart(this.getBettingWindowMs());
      this.logger.log(`Created betting round ${round.id}`);
      return;
    }

    if (currentRound.status === "betting") {
      this.scheduleRoundStart(this.getBettingWindowMs());
      return;
    }

    if (currentRound.status === "running") {
      this.scheduleRoundCrash(this.getCrashDelayMs(currentRound.crashPoint.basisPoints));
    }
  }

  async startCurrentRound(now = new Date()): Promise<void> {
    const round = await this.rounds.findCurrent();

    if (!round || round.status !== "betting") {
      await this.ensureScheduledRound(now);
      return;
    }

    round.start(now);
    await this.rounds.save(round);
    this.realtime.roundStarted(round);
    this.scheduleRoundCrash(this.getCrashDelayMs(round.crashPoint.basisPoints));
    this.logger.log(`Started round ${round.id}`);
  }

  async crashCurrentRound(now = new Date()): Promise<void> {
    const round = await this.rounds.findCurrent();

    if (!round || round.status !== "running") {
      await this.ensureScheduledRound(now);
      return;
    }

    round.crash(now);
    await this.rounds.save(round);
    this.realtime.roundCrashed(round);

    const nextRound = this.roundFactory.createNextRound({
      now,
      nonce: BigInt(now.getTime()),
    });
    await this.rounds.save(nextRound);
    this.realtime.roundCreated(nextRound);
    this.scheduleRoundStart(this.getBettingWindowMs());
    this.logger.log(`Crashed round ${round.id} and created ${nextRound.id}`);
  }

  getBettingWindowMs(): number {
    return this.getPositiveIntegerConfig("ROUND_BETTING_WINDOW_MS", DEFAULT_BETTING_WINDOW_MS);
  }

  getCrashDelayMs(crashPointBasisPoints: bigint): number {
    if (crashPointBasisPoints <= INITIAL_MULTIPLIER_BASIS_POINTS) {
      return 0;
    }

    const growthBasisPoints = crashPointBasisPoints - INITIAL_MULTIPLIER_BASIS_POINTS;
    const milliseconds = (growthBasisPoints * 1_000n) / BASIS_POINTS_PER_SECOND;

    return Number(milliseconds);
  }

  private scheduleRoundStart(delayMs: number): void {
    this.schedule(() => void this.startCurrentRound(), delayMs);
  }

  private scheduleRoundCrash(delayMs: number): void {
    this.schedule(() => void this.crashCurrentRound(), delayMs);
  }

  private schedule(callback: () => void, delayMs: number): void {
    this.clearTimer();
    this.timer = setTimeout(callback, delayMs);
    this.timer.unref?.();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private getPositiveIntegerConfig(key: string, fallback: number): number {
    const value = this.config.get<string>(key);
    const parsedValue = value ? Number(value) : fallback;

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return fallback;
    }

    return parsedValue;
  }
}
