import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WALLET_REPOSITORY } from "./application/ports/wallet.repository";
import { CreditWalletForCashoutHandler } from "./application/use-cases/credit-wallet-for-cashout.handler";
import { CreateWalletForUserHandler } from "./application/use-cases/create-wallet-for-user.handler";
import { DebitWalletForBetHandler } from "./application/use-cases/debit-wallet-for-bet.handler";
import { GetWalletForUserHandler } from "./application/use-cases/get-wallet-for-user.handler";
import { JwtAuthGuard } from "./infrastructure/auth/jwt-auth.guard";
import { RabbitmqWalletEventsService } from "./infrastructure/messaging/rabbitmq-wallet-events.service";
import { PrismaService } from "./infrastructure/persistence/prisma/prisma.service";
import { PrismaWalletRepository } from "./infrastructure/persistence/repositories/prisma-wallet.repository";
import { HealthController } from "./presentation/http/controllers/health.controller";
import { WalletsController } from "./presentation/http/controllers/wallets.controller";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController, WalletsController],
  providers: [
    PrismaService,
    PrismaWalletRepository,
    {
      provide: WALLET_REPOSITORY,
      useExisting: PrismaWalletRepository,
    },
    CreateWalletForUserHandler,
    GetWalletForUserHandler,
    DebitWalletForBetHandler,
    CreditWalletForCashoutHandler,
    RabbitmqWalletEventsService,
    JwtAuthGuard,
  ],
})
export class AppModule {}
