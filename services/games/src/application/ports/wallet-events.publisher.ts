export const WALLET_EVENTS_PUBLISHER = Symbol("WALLET_EVENTS_PUBLISHER");

export type RequestWalletDebitCommand = {
  walletUserId: string;
  roundId: string;
  betId: string;
  amountCents: bigint;
};

export type RequestWalletCreditCommand = {
  walletUserId: string;
  roundId: string;
  betId: string;
  amountCents: bigint;
};

export interface WalletEventsPublisher {
  requestDebit(command: RequestWalletDebitCommand): void;
  requestCredit(command: RequestWalletCreditCommand): void;
}
