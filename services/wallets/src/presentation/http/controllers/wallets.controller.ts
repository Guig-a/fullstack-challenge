import { Controller, Get, HttpCode, NotFoundException, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CreateWalletForUserHandler } from "../../../application/use-cases/create-wallet-for-user.handler";
import { GetWalletForUserHandler } from "../../../application/use-cases/get-wallet-for-user.handler";
import { WalletNotFoundError } from "../../../application/use-cases/wallet-not-found.error";
import type { AuthenticatedRequest } from "../../../infrastructure/auth/authenticated-user";
import { JwtAuthGuard } from "../../../infrastructure/auth/jwt-auth.guard";
import { WalletResponseDto } from "../dtos/wallet-response.dto";

@ApiTags("wallets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletForUser: CreateWalletForUserHandler,
    private readonly getWalletForUser: GetWalletForUserHandler,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiCreatedResponse({ type: WalletResponseDto })
  @ApiUnauthorizedResponse({ description: "Bearer token is missing or invalid." })
  async create(@Req() request: AuthenticatedRequest): Promise<WalletResponseDto> {
    const wallet = await this.createWalletForUser.execute(this.getUserId(request));

    return WalletResponseDto.fromDomain(wallet);
  }

  @Get("me")
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiUnauthorizedResponse({ description: "Bearer token is missing or invalid." })
  async me(@Req() request: AuthenticatedRequest): Promise<WalletResponseDto> {
    try {
      const wallet = await this.getWalletForUser.execute(this.getUserId(request));

      return WalletResponseDto.fromDomain(wallet);
    } catch (error) {
      if (error instanceof WalletNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  private getUserId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated request user is missing");
    }

    return request.user.id;
  }
}
