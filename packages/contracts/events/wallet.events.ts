import type { EventEnvelope } from "./event-envelope";

export const WALLET_EVENTS_EXCHANGE = "wallet.events";

export const WALLET_EVENT_ROUTING_KEYS = {
  debitRequested: "wallet.debit.requested",
  debited: "wallet.debited",
  creditRequested: "wallet.credit.requested",
  credited: "wallet.credited",
  operationRejected: "wallet.operation.rejected",
} as const;

export const WALLET_EVENT_QUEUES = {
  walletRequests: "wallet.requests",
  gameWalletResults: "game.wallet.results",
} as const;

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
    operation: "DEBIT" | "CREDIT";
    reason: "INSUFFICIENT_FUNDS" | "WALLET_NOT_FOUND" | "DUPLICATED_OPERATION";
  }
>;

export type WalletEvent =
  | WalletDebitRequested
  | WalletDebited
  | WalletCreditRequested
  | WalletCredited
  | WalletOperationRejected;
