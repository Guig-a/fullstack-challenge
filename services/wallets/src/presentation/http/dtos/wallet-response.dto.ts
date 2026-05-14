import { ApiProperty } from "@nestjs/swagger";
import type { Wallet } from "../../../domain/wallet/wallet.entity";

export class WalletResponseDto {
  @ApiProperty({ example: "f352f978-ece5-4e30-95b1-2fa218068a7d" })
  id: string;

  @ApiProperty({ example: "960a8657-d67f-4e3e-8939-2d2784b2455f" })
  userId: string;

  @ApiProperty({ example: "10000", description: "Balance stored as integer cents." })
  balanceCents: string;

  @ApiProperty({ example: "100.00", description: "Human-readable balance derived from cents." })
  balance: string;

  @ApiProperty({ example: "2026-05-13T00:00:00.000Z" })
  createdAt: string;

  @ApiProperty({ example: "2026-05-13T00:00:00.000Z" })
  updatedAt: string;

  static fromDomain(wallet: Wallet): WalletResponseDto {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balanceCents: wallet.balance.cents.toString(),
      balance: wallet.balance.toDecimalString(),
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }
}
