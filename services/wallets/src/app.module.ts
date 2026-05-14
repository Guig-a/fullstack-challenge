import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WALLET_REPOSITORY } from "./application/ports/wallet.repository";
import { CreateWalletForUserHandler } from "./application/use-cases/create-wallet-for-user.handler";
import { GetWalletForUserHandler } from "./application/use-cases/get-wallet-for-user.handler";
import { JwtAuthGuard } from "./infrastructure/auth/jwt-auth.guard";
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
    JwtAuthGuard,
  ],
})
export class AppModule {}
