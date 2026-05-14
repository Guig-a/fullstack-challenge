import { Module } from "@nestjs/common";
import { ROUND_REPOSITORY } from "./application/ports/round.repository";
import { PrismaService } from "./infrastructure/persistence/prisma/prisma.service";
import { PrismaRoundRepository } from "./infrastructure/persistence/repositories/prisma-round.repository";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  controllers: [GamesController],
  providers: [
    PrismaService,
    PrismaRoundRepository,
    {
      provide: ROUND_REPOSITORY,
      useExisting: PrismaRoundRepository,
    },
  ],
})
export class AppModule {}
