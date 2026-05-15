import { Injectable } from "@nestjs/common";
import { OnGatewayInit, WebSocketGateway } from "@nestjs/websockets";
import type { Server } from "socket.io";
import type { RoundRealtimePublisher } from "../../application/ports/round-realtime.publisher";
import { Bet } from "../../domain/round/bet.entity";
import { Round } from "../../domain/round/round.entity";
import { BetResponseDto } from "../dtos/bet-response.dto";
import { RoundResponseDto } from "../dtos/round-response.dto";

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*",
  },
  path: "/socket.io",
})
export class RoundsGateway implements RoundRealtimePublisher, OnGatewayInit<Server> {
  private server?: Server;

  afterInit(server: Server): void {
    this.server = server;
  }

  roundCreated(round: Round): void {
    this.emit("round.created", { round: RoundResponseDto.fromDomain(round) });
  }

  roundStarted(round: Round): void {
    this.emit("round.started", { round: RoundResponseDto.fromDomain(round) });
  }

  roundCrashed(round: Round): void {
    this.emit("round.crashed", { round: RoundResponseDto.fromDomain(round) });
  }

  betPlaced(round: Round, bet: Bet): void {
    this.emit("bet.placed", {
      roundId: round.id,
      bet: BetResponseDto.fromDomain(bet),
    });
  }

  betConfirmed(round: Round, bet: Bet): void {
    this.emit("bet.confirmed", {
      roundId: round.id,
      bet: BetResponseDto.fromDomain(bet),
    });
  }

  betCashedOut(round: Round, bet: Bet): void {
    this.emit("bet.cashed_out", {
      roundId: round.id,
      bet: BetResponseDto.fromDomain(bet),
    });
  }

  betRejected(round: Round, bet: Bet): void {
    this.emit("bet.rejected", {
      roundId: round.id,
      bet: BetResponseDto.fromDomain(bet),
    });
  }

  private emit(event: string, payload: unknown): void {
    this.server?.emit(event, payload);
  }
}
