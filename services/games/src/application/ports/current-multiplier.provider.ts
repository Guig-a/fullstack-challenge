import { Multiplier } from "../../domain/multiplier/multiplier.vo";
import { Round } from "../../domain/round/round.entity";

export const CURRENT_MULTIPLIER_PROVIDER = Symbol("CURRENT_MULTIPLIER_PROVIDER");

export interface CurrentMultiplierProvider {
  getCurrentMultiplier(round: Round, now: Date): Multiplier;
}
