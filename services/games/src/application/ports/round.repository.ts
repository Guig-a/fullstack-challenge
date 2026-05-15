import { Bet } from "../../domain/round/bet.entity";
import { Round } from "../../domain/round/round.entity";

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");

export type RoundHistoryQuery = {
  limit: number;
  offset: number;
};

export type PlayerBetHistoryQuery = RoundHistoryQuery & {
  userId: string;
};

export interface RoundRepository {
  findById(id: string): Promise<Round | null>;
  findCurrent(): Promise<Round | null>;
  findHistory(query: RoundHistoryQuery): Promise<Round[]>;
  findBetsByUserId(query: PlayerBetHistoryQuery): Promise<Bet[]>;
  save(round: Round): Promise<Round>;
}
