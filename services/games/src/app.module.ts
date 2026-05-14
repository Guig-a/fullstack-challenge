import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CURRENT_MULTIPLIER_PROVIDER } from "./application/ports/current-multiplier.provider";
import { ROUND_REPOSITORY } from "./application/ports/round.repository";
import { CashOutBetHandler } from "./application/use-cases/cash-out-bet.handler";
import { GetCurrentRoundHandler } from "./application/use-cases/get-current-round.handler";
import { GetRoundHistoryHandler } from "./application/use-cases/get-round-history.handler";
import { GetRoundVerificationHandler } from "./application/use-cases/get-round-verification.handler";
import { PlaceBetHandler } from "./application/use-cases/place-bet.handler";
import { JwtAuthGuard } from "./infrastructure/auth/jwt-auth.guard";
import { PrismaService } from "./infrastructure/persistence/prisma/prisma.service";
import { PrismaRoundRepository } from "./infrastructure/persistence/repositories/prisma-round.repository";
import { ElapsedTimeCurrentMultiplierProvider } from "./infrastructure/time/elapsed-time-current-multiplier.provider";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [GamesController],
  providers: [
    PrismaService,
    PrismaRoundRepository,
    ElapsedTimeCurrentMultiplierProvider,
    GetCurrentRoundHandler,
    GetRoundHistoryHandler,
    GetRoundVerificationHandler,
    PlaceBetHandler,
    CashOutBetHandler,
    JwtAuthGuard,
    {
      provide: ROUND_REPOSITORY,
      useExisting: PrismaRoundRepository,
    },
    {
      provide: CURRENT_MULTIPLIER_PROVIDER,
      useExisting: ElapsedTimeCurrentMultiplierProvider,
    },
  ],
})
export class AppModule {}
