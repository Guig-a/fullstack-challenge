import { ConflictException, Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { GetCurrentRoundHandler } from "../../application/use-cases/get-current-round.handler";
import { GetRoundHistoryHandler } from "../../application/use-cases/get-round-history.handler";
import { GetRoundVerificationHandler } from "../../application/use-cases/get-round-verification.handler";
import { RoundNotFoundError } from "../../application/use-cases/round-not-found.error";
import { RoundVerificationUnavailableError } from "../../application/use-cases/round-verification-unavailable.error";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { RoundHistoryResponseDto } from "../dtos/round-history-response.dto";
import { RoundProofResponseDto } from "../dtos/round-proof-response.dto";
import { RoundResponseDto } from "../dtos/round-response.dto";

@Controller()
export class GamesController {
  constructor(
    private readonly getCurrentRound: GetCurrentRoundHandler,
    private readonly getRoundHistory: GetRoundHistoryHandler,
    private readonly getRoundVerification: GetRoundVerificationHandler,
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
}
