import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  WALLET_EVENTS_EXCHANGE,
  WALLET_EVENT_QUEUES,
  WALLET_EVENT_ROUTING_KEYS,
  type WalletCredited,
  type WalletDebited,
  type WalletOperationRejected,
} from "@crash/contracts";
import amqp from "amqplib";
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { HandleWalletOperationRejectedHandler } from "../../application/use-cases/handle-wallet-operation-rejected.handler";

type WalletResultEvent = WalletDebited | WalletCredited | WalletOperationRejected;

@Injectable()
export class RabbitmqWalletResultsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqWalletResultsConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly handleWalletOperationRejected: HandleWalletOperationRejectedHandler) {}

  async onModuleInit(): Promise<void> {
    const rabbitmqUrl = process.env.RABBITMQ_URL;

    if (!rabbitmqUrl) {
      throw new Error("RABBITMQ_URL is required");
    }

    this.connection = await amqp.connect(rabbitmqUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(WALLET_EVENTS_EXCHANGE, "topic", { durable: true });
    await this.channel.assertQueue(WALLET_EVENT_QUEUES.gameWalletResults, { durable: true });

    for (const routingKey of [
      WALLET_EVENT_ROUTING_KEYS.debited,
      WALLET_EVENT_ROUTING_KEYS.credited,
      WALLET_EVENT_ROUTING_KEYS.operationRejected,
    ]) {
      await this.channel.bindQueue(WALLET_EVENT_QUEUES.gameWalletResults, WALLET_EVENTS_EXCHANGE, routingKey);
    }

    await this.channel.consume(WALLET_EVENT_QUEUES.gameWalletResults, (message) => void this.handleMessage(message), {
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
      const event = JSON.parse(message.content.toString()) as WalletResultEvent;

      if (event.type === WALLET_EVENT_ROUTING_KEYS.operationRejected) {
        await this.handleWalletOperationRejected.execute({
          ...event.payload,
          rejectedAt: new Date(event.occurredAt),
        });
      }

      this.logger.log(`Wallet result received: ${event.type} for bet ${event.payload.betId}`);
      this.channel.ack(message);
    } catch (error) {
      this.logger.error("Failed to process wallet result event", error);
      this.channel.nack(message, false, false);
    }
  }
}
