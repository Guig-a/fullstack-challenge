import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  WALLET_EVENTS_EXCHANGE,
  WALLET_EVENT_QUEUES,
  WALLET_EVENT_ROUTING_KEYS,
  type EventEnvelope,
  type WalletCreditRequested,
  type WalletCredited,
  type WalletDebitRequested,
  type WalletDebited,
  type WalletOperationRejected,
} from "@crash/contracts";
import amqp from "amqplib";
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { CreditWalletForCashoutHandler } from "../../application/use-cases/credit-wallet-for-cashout.handler";
import { DebitWalletForBetHandler } from "../../application/use-cases/debit-wallet-for-bet.handler";
import { WalletNotFoundError } from "../../application/use-cases/wallet-not-found.error";
import { InsufficientFundsError } from "../../domain/wallet/wallet.errors";

type WalletRequestEvent = WalletDebitRequested | WalletCreditRequested;

@Injectable()
export class RabbitmqWalletEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqWalletEventsService.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(
    private readonly debitWalletForBet: DebitWalletForBetHandler,
    private readonly creditWalletForCashout: CreditWalletForCashoutHandler,
  ) {}

  async onModuleInit(): Promise<void> {
    const rabbitmqUrl = process.env.RABBITMQ_URL;

    if (!rabbitmqUrl) {
      throw new Error("RABBITMQ_URL is required");
    }

    this.connection = await amqp.connect(rabbitmqUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(WALLET_EVENTS_EXCHANGE, "topic", { durable: true });
    await this.channel.assertQueue(WALLET_EVENT_QUEUES.walletRequests, { durable: true });
    await this.channel.bindQueue(
      WALLET_EVENT_QUEUES.walletRequests,
      WALLET_EVENTS_EXCHANGE,
      WALLET_EVENT_ROUTING_KEYS.debitRequested,
    );
    await this.channel.bindQueue(
      WALLET_EVENT_QUEUES.walletRequests,
      WALLET_EVENTS_EXCHANGE,
      WALLET_EVENT_ROUTING_KEYS.creditRequested,
    );
    await this.channel.consume(WALLET_EVENT_QUEUES.walletRequests, (message) => void this.handleMessage(message), {
      noAck: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    try {
      const event = JSON.parse(message.content.toString()) as WalletRequestEvent;

      if (event.type === WALLET_EVENT_ROUTING_KEYS.debitRequested) {
        await this.handleDebitRequested(event);
      }

      if (event.type === WALLET_EVENT_ROUTING_KEYS.creditRequested) {
        await this.handleCreditRequested(event);
      }

      this.channel.ack(message);
    } catch (error) {
      this.logger.error("Failed to process wallet event", error);
      this.channel.nack(message, false, false);
    }
  }

  private async handleDebitRequested(event: WalletDebitRequested): Promise<void> {
    try {
      const wallet = await this.debitWalletForBet.execute({
        userId: event.payload.walletUserId,
        amountCents: BigInt(event.payload.amountCents),
      });

      this.publish(WALLET_EVENT_ROUTING_KEYS.debited, {
        ...this.createEnvelope("wallet.debited", {
          walletUserId: event.payload.walletUserId,
          roundId: event.payload.roundId,
          betId: event.payload.betId,
          amountCents: event.payload.amountCents,
          balanceCents: wallet.balance.cents.toString(),
        }),
      } satisfies WalletDebited);
    } catch (error) {
      this.publishRejected(event, this.toRejectionReason(error));
    }
  }

  private async handleCreditRequested(event: WalletCreditRequested): Promise<void> {
    try {
      const wallet = await this.creditWalletForCashout.execute({
        userId: event.payload.walletUserId,
        amountCents: BigInt(event.payload.amountCents),
      });

      this.publish(WALLET_EVENT_ROUTING_KEYS.credited, {
        ...this.createEnvelope("wallet.credited", {
          walletUserId: event.payload.walletUserId,
          roundId: event.payload.roundId,
          betId: event.payload.betId,
          amountCents: event.payload.amountCents,
          balanceCents: wallet.balance.cents.toString(),
        }),
      } satisfies WalletCredited);
    } catch (error) {
      this.publishRejected(event, this.toRejectionReason(error));
    }
  }

  private publishRejected(
    event: WalletRequestEvent,
    reason: WalletOperationRejected["payload"]["reason"],
  ): void {
    this.publish(WALLET_EVENT_ROUTING_KEYS.operationRejected, {
      ...this.createEnvelope("wallet.operation.rejected", {
        walletUserId: event.payload.walletUserId,
        roundId: event.payload.roundId,
        betId: event.payload.betId,
        reason,
      }),
    } satisfies WalletOperationRejected);
  }

  private publish(routingKey: string, event: EventEnvelope<string, unknown>): void {
    if (!this.channel) {
      throw new Error("RabbitMQ channel is not initialized");
    }

    this.channel.publish(WALLET_EVENTS_EXCHANGE, routingKey, Buffer.from(JSON.stringify(event)), {
      contentType: "application/json",
      deliveryMode: 2,
    });
  }

  private createEnvelope<TType extends string, TPayload>(type: TType, payload: TPayload): EventEnvelope<TType, TPayload> {
    return {
      eventId: crypto.randomUUID(),
      type,
      schemaVersion: 1,
      occurredAt: new Date().toISOString(),
      payload,
    };
  }

  private toRejectionReason(error: unknown): WalletOperationRejected["payload"]["reason"] {
    if (error instanceof InsufficientFundsError) {
      return "INSUFFICIENT_FUNDS";
    }

    if (error instanceof WalletNotFoundError) {
      return "WALLET_NOT_FOUND";
    }

    throw error;
  }
}
