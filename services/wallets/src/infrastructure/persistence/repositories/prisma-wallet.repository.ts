import { Injectable } from "@nestjs/common";
import { Wallet } from "../../../domain/wallet/wallet.entity";
import type { WalletRepository } from "../../../application/ports/wallet.repository";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return null;
    }

    return Wallet.rehydrate({
      id: wallet.id,
      userId: wallet.userId,
      balanceCents: wallet.balanceCents,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    });
  }

  async save(wallet: Wallet): Promise<Wallet> {
    const snapshot = wallet.toSnapshot();
    const persistedWallet = await this.prisma.wallet.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        userId: snapshot.userId,
        balanceCents: snapshot.balanceCents,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      },
      update: {
        balanceCents: snapshot.balanceCents,
        updatedAt: snapshot.updatedAt,
      },
    });

    return Wallet.rehydrate({
      id: persistedWallet.id,
      userId: persistedWallet.userId,
      balanceCents: persistedWallet.balanceCents,
      createdAt: persistedWallet.createdAt,
      updatedAt: persistedWallet.updatedAt,
    });
  }
}
