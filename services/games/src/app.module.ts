import { Module } from "@nestjs/common";
import { ROUND_REPOSITORY } from "./application/ports/round.repository";
import { GetCurrentRoundHandler } from "./application/use-cases/get-current-round.handler";
import { GetRoundHistoryHandler } from "./application/use-cases/get-round-history.handler";
import { GetRoundVerificationHandler } from "./application/use-cases/get-round-verification.handler";
import { PrismaService } from "./infrastructure/persistence/prisma/prisma.service";
import { PrismaRoundRepository } from "./infrastructure/persistence/repositories/prisma-round.repository";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  controllers: [GamesController],
  providers: [
    PrismaService,
    PrismaRoundRepository,
    GetCurrentRoundHandler,
    GetRoundHistoryHandler,
    GetRoundVerificationHandler,
    {
      provide: ROUND_REPOSITORY,
      useExisting: PrismaRoundRepository,
    },
  ],
})
export class AppModule {}
