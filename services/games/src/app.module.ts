import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CURRENT_MULTIPLIER_PROVIDER } from "./application/ports/current-multiplier.provider";
import { ROUND_REPOSITORY } from "./application/ports/round.repository";
import { WALLET_EVENTS_PUBLISHER } from "./application/ports/wallet-events.publisher";
import { RoundEngineService } from "./application/services/round-engine.service";
import { RoundFactoryService } from "./application/services/round-factory.service";
import { CashOutBetHandler } from "./application/use-cases/cash-out-bet.handler";
import { GetCurrentRoundHandler } from "./application/use-cases/get-current-round.handler";
import { GetRoundHistoryHandler } from "./application/use-cases/get-round-history.handler";
import { GetRoundVerificationHandler } from "./application/use-cases/get-round-verification.handler";
import { HandleWalletOperationRejectedHandler } from "./application/use-cases/handle-wallet-operation-rejected.handler";
import { PlaceBetHandler } from "./application/use-cases/place-bet.handler";
import { JwtAuthGuard } from "./infrastructure/auth/jwt-auth.guard";
import { RabbitmqWalletEventsPublisher } from "./infrastructure/messaging/rabbitmq-wallet-events.publisher";
import { RabbitmqWalletResultsConsumer } from "./infrastructure/messaging/rabbitmq-wallet-results.consumer";
import { PrismaService } from "./infrastructure/persistence/prisma/prisma.service";
import { PrismaRoundRepository } from "./infrastructure/persistence/repositories/prisma-round.repository";
import { ElapsedTimeCurrentMultiplierProvider } from "./infrastructure/time/elapsed-time-current-multiplier.provider";
import { ProvablyFairService } from "./domain/provably-fair/provably-fair.service";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [GamesController],
  providers: [
    PrismaService,
    PrismaRoundRepository,
    ElapsedTimeCurrentMultiplierProvider,
    ProvablyFairService,
    RoundFactoryService,
    RoundEngineService,
    RabbitmqWalletEventsPublisher,
    RabbitmqWalletResultsConsumer,
    GetCurrentRoundHandler,
    GetRoundHistoryHandler,
    GetRoundVerificationHandler,
    HandleWalletOperationRejectedHandler,
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
    {
      provide: WALLET_EVENTS_PUBLISHER,
      useExisting: RabbitmqWalletEventsPublisher,
    },
  ],
})
export class AppModule {}
