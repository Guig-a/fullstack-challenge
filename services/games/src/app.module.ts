import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CURRENT_MULTIPLIER_PROVIDER } from "./application/ports/current-multiplier.provider";
import { ROUND_REALTIME_PUBLISHER } from "./application/ports/round-realtime.publisher";
import { ROUND_REPOSITORY } from "./application/ports/round.repository";
import { WALLET_EVENTS_PUBLISHER } from "./application/ports/wallet-events.publisher";
import { RoundEngineService } from "./application/services/round-engine.service";
import { RoundFactoryService } from "./application/services/round-factory.service";
import { CashOutBetHandler } from "./application/use-cases/cash-out-bet.handler";
import { GetPlayerBetHistoryHandler } from "./application/use-cases/get-player-bet-history.handler";
import { GetCurrentRoundHandler } from "./application/use-cases/get-current-round.handler";
import { GetRoundHistoryHandler } from "./application/use-cases/get-round-history.handler";
import { GetRoundVerificationHandler } from "./application/use-cases/get-round-verification.handler";
import { HandleWalletDebitedHandler } from "./application/use-cases/handle-wallet-debited.handler";
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
import { RoundsGateway } from "./presentation/gateways/rounds.gateway";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [GamesController],
  providers: [
    PrismaService,
    PrismaRoundRepository,
    ElapsedTimeCurrentMultiplierProvider,
    ProvablyFairService,
    RoundsGateway,
    RoundFactoryService,
    RoundEngineService,
    RabbitmqWalletEventsPublisher,
    RabbitmqWalletResultsConsumer,
    GetPlayerBetHistoryHandler,
    GetCurrentRoundHandler,
    GetRoundHistoryHandler,
    GetRoundVerificationHandler,
    HandleWalletDebitedHandler,
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
      provide: ROUND_REALTIME_PUBLISHER,
      useExisting: RoundsGateway,
    },
    {
      provide: WALLET_EVENTS_PUBLISHER,
      useExisting: RabbitmqWalletEventsPublisher,
    },
  ],
})
export class AppModule {}
