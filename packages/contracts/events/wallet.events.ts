import type { EventEnvelope } from "./event-envelope";

export type WalletDebitRequested = EventEnvelope<
  "wallet.debit.requested",
  {
    walletUserId: string;
    roundId: string;
    betId: string;
    amountCents: string;
  }
>;

export type WalletDebited = EventEnvelope<
  "wallet.debited",
  {
    walletUserId: string;
    roundId: string;
    betId: string;
    amountCents: string;
    balanceCents: string;
  }
>;

export type WalletCreditRequested = EventEnvelope<
  "wallet.credit.requested",
  {
    walletUserId: string;
    roundId: string;
    betId: string;
    amountCents: string;
  }
>;

export type WalletCredited = EventEnvelope<
  "wallet.credited",
  {
    walletUserId: string;
    roundId: string;
    betId: string;
    amountCents: string;
    balanceCents: string;
  }
>;

export type WalletOperationRejected = EventEnvelope<
  "wallet.operation.rejected",
  {
    walletUserId: string;
    roundId: string;
    betId: string;
    reason: "INSUFFICIENT_FUNDS" | "WALLET_NOT_FOUND" | "DUPLICATED_OPERATION";
  }
>;

export type WalletEvent =
  | WalletDebitRequested
  | WalletDebited
  | WalletCreditRequested
  | WalletCredited
  | WalletOperationRejected;
