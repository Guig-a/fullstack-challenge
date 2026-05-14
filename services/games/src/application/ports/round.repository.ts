import { Round } from "../../domain/round/round.entity";

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");

export interface RoundRepository {
  findById(id: string): Promise<Round | null>;
  findCurrent(): Promise<Round | null>;
  save(round: Round): Promise<Round>;
}
