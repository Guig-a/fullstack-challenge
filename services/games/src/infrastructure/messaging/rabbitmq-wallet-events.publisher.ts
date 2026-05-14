import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  WALLET_EVENTS_EXCHANGE,
  WALLET_EVENT_ROUTING_KEYS,
  type EventEnvelope,
  type WalletCreditRequested,
  type WalletDebitRequested,
} from "@crash/contracts";
import amqp from "amqplib";
import type { Channel, ChannelModel } from "amqplib";
import type {
  RequestWalletCreditCommand,
  RequestWalletDebitCommand,
  WalletEventsPublisher,
} from "../../application/ports/wallet-events.publisher";

@Injectable()
export class RabbitmqWalletEventsPublisher implements WalletEventsPublisher, OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: Channel;

  async onModuleInit(): Promise<void> {
    const rabbitmqUrl = process.env.RABBITMQ_URL;

    if (!rabbitmqUrl) {
      throw new Error("RABBITMQ_URL is required");
    }

    this.connection = await amqp.connect(rabbitmqUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(WALLET_EVENTS_EXCHANGE, "topic", { durable: true });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  requestDebit(command: RequestWalletDebitCommand): void {
    this.publish(WALLET_EVENT_ROUTING_KEYS.debitRequested, {
      ...this.createEnvelope("wallet.debit.requested", {
        walletUserId: command.walletUserId,
        roundId: command.roundId,
        betId: command.betId,
        amountCents: command.amountCents.toString(),
      }),
    } satisfies WalletDebitRequested);
  }

  requestCredit(command: RequestWalletCreditCommand): void {
    this.publish(WALLET_EVENT_ROUTING_KEYS.creditRequested, {
      ...this.createEnvelope("wallet.credit.requested", {
        walletUserId: command.walletUserId,
        roundId: command.roundId,
        betId: command.betId,
        amountCents: command.amountCents.toString(),
      }),
    } satisfies WalletCreditRequested);
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
}
