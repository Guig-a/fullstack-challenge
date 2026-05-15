import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CashOutBetHandler } from "../../application/use-cases/cash-out-bet.handler";
import { CurrentRoundNotFoundError } from "../../application/use-cases/current-round-not-found.error";
import { GetPlayerBetHistoryHandler } from "../../application/use-cases/get-player-bet-history.handler";
import { GetCurrentRoundHandler } from "../../application/use-cases/get-current-round.handler";
import { GetRoundHistoryHandler } from "../../application/use-cases/get-round-history.handler";
import { GetRoundVerificationHandler } from "../../application/use-cases/get-round-verification.handler";
import { PlaceBetHandler } from "../../application/use-cases/place-bet.handler";
import { RoundNotFoundError } from "../../application/use-cases/round-not-found.error";
import { RoundVerificationUnavailableError } from "../../application/use-cases/round-verification-unavailable.error";
import type { AuthenticatedRequest } from "../../infrastructure/auth/authenticated-user";
import { JwtAuthGuard } from "../../infrastructure/auth/jwt-auth.guard";
import {
  BetAlreadySettledError,
  BetDebitNotConfirmedError,
  BetNotFoundError,
  DuplicateBetError,
  InvalidBetAmountError,
  RoundAlreadyCrashedError,
  RoundNotBettingError,
  RoundNotRunningError,
} from "../../domain/round/round.errors";
import { BetResponseDto } from "../dtos/bet-response.dto";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { PlayerBetHistoryResponseDto } from "../dtos/player-bet-history-response.dto";
import { PlaceBetRequestDto } from "../dtos/place-bet-request.dto";
import { RoundHistoryResponseDto } from "../dtos/round-history-response.dto";
import { RoundProofResponseDto } from "../dtos/round-proof-response.dto";
import { RoundResponseDto } from "../dtos/round-response.dto";

@Controller()
export class GamesController {
  constructor(
    private readonly getPlayerBetHistory: GetPlayerBetHistoryHandler,
    private readonly getCurrentRound: GetCurrentRoundHandler,
    private readonly getRoundHistory: GetRoundHistoryHandler,
    private readonly getRoundVerification: GetRoundVerificationHandler,
    private readonly placeBet: PlaceBetHandler,
    private readonly cashOutBet: CashOutBetHandler,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }

  @Get("rounds/current")
  async currentRound(): Promise<RoundResponseDto> {
    const round = await this.getCurrentRound.execute();

    if (!round) {
      throw new NotFoundException("Current round was not found.");
    }

    return RoundResponseDto.fromDomain(round);
  }

  @Get("rounds/history")
  async roundHistory(@Query("limit") limit?: string, @Query("offset") offset?: string): Promise<RoundHistoryResponseDto> {
    const pagination = this.parsePagination(limit, offset);
    const rounds = await this.getRoundHistory.execute(pagination);

    return RoundHistoryResponseDto.fromDomain(rounds, pagination);
  }

  @Get("rounds/:roundId/verify")
  async verifyRound(@Param("roundId") roundId: string): Promise<RoundProofResponseDto> {
    try {
      const round = await this.getRoundVerification.execute(roundId);

      return RoundProofResponseDto.fromDomain(round);
    } catch (error) {
      if (error instanceof RoundNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof RoundVerificationUnavailableError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Get("bets/me")
  @UseGuards(JwtAuthGuard)
  async myBets(
    @Req() request: AuthenticatedRequest,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<PlayerBetHistoryResponseDto> {
    const pagination = this.parsePagination(limit, offset);
    const bets = await this.getPlayerBetHistory.execute({
      userId: this.getUserId(request),
      ...pagination,
    });

    return PlayerBetHistoryResponseDto.fromDomain(bets, pagination);
  }

  @Post("bet")
  @UseGuards(JwtAuthGuard)
  async bet(@Req() request: AuthenticatedRequest, @Body() body: PlaceBetRequestDto): Promise<BetResponseDto> {
    try {
      const bet = await this.placeBet.execute({
        userId: this.getUserId(request),
        amountCents: this.parseAmountCents(body.amountCents),
        placedAt: new Date(),
      });

      return BetResponseDto.fromDomain(bet);
    } catch (error) {
      this.handleBetCommandError(error);
    }
  }

  @Post("bet/cashout")
  @UseGuards(JwtAuthGuard)
  async cashout(@Req() request: AuthenticatedRequest): Promise<BetResponseDto> {
    try {
      const bet = await this.cashOutBet.execute({
        userId: this.getUserId(request),
        cashedOutAt: new Date(),
      });

      return BetResponseDto.fromDomain(bet);
    } catch (error) {
      this.handleBetCommandError(error);
    }
  }

  private parsePagination(limit?: string, offset?: string): { limit: number; offset: number } {
    return {
      limit: this.parseIntegerQuery(limit, 20, 1, 50),
      offset: this.parseIntegerQuery(offset, 0, 0, Number.MAX_SAFE_INTEGER),
    };
  }

  private parseIntegerQuery(value: string | undefined, defaultValue: number, min: number, max: number): number {
    if (value === undefined) {
      return defaultValue;
    }

    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue)) {
      return defaultValue;
    }

    return Math.min(Math.max(parsedValue, min), max);
  }

  private parseAmountCents(amountCents: string | undefined): bigint {
    if (amountCents === undefined || !/^\d+$/.test(amountCents)) {
      throw new BadRequestException("amountCents must be an integer string.");
    }

    return BigInt(amountCents);
  }

  private getUserId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated request user is missing");
    }

    return request.user.id;
  }

  private handleBetCommandError(error: unknown): never {
    if (error instanceof CurrentRoundNotFoundError || error instanceof BetNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof InvalidBetAmountError) {
      throw new BadRequestException(error.message);
    }

    if (
      error instanceof DuplicateBetError ||
      error instanceof RoundNotBettingError ||
      error instanceof RoundNotRunningError ||
      error instanceof RoundAlreadyCrashedError ||
      error instanceof BetDebitNotConfirmedError ||
      error instanceof BetAlreadySettledError
    ) {
      throw new ConflictException(error.message);
    }

    throw error;
  }
}
