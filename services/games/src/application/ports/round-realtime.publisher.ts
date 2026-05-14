import { Bet } from "../../domain/round/bet.entity";
import { Round } from "../../domain/round/round.entity";

export const ROUND_REALTIME_PUBLISHER = Symbol("ROUND_REALTIME_PUBLISHER");

export interface RoundRealtimePublisher {
  roundCreated(round: Round): void;
  roundStarted(round: Round): void;
  roundCrashed(round: Round): void;
  betPlaced(round: Round, bet: Bet): void;
  betCashedOut(round: Round, bet: Bet): void;
  betRejected(round: Round, bet: Bet): void;
}
