import { Injectable } from "@nestjs/common";
import type { CurrentMultiplierProvider } from "../../application/ports/current-multiplier.provider";
import { Multiplier } from "../../domain/multiplier/multiplier.vo";
import { Round } from "../../domain/round/round.entity";

const INITIAL_MULTIPLIER_BASIS_POINTS = 100n;
const BASIS_POINTS_PER_SECOND = 10n;

@Injectable()
export class ElapsedTimeCurrentMultiplierProvider implements CurrentMultiplierProvider {
  getCurrentMultiplier(round: Round, now: Date): Multiplier {
    if (!round.startedAt) {
      return Multiplier.fromBasisPoints(INITIAL_MULTIPLIER_BASIS_POINTS);
    }

    const elapsedMilliseconds = BigInt(Math.max(0, now.getTime() - round.startedAt.getTime()));
    const elapsedBasisPoints = (elapsedMilliseconds * BASIS_POINTS_PER_SECOND) / 1_000n;
    const calculatedBasisPoints = INITIAL_MULTIPLIER_BASIS_POINTS + elapsedBasisPoints;
    const maxCashoutBasisPoints =
      round.crashPoint.basisPoints > INITIAL_MULTIPLIER_BASIS_POINTS
        ? round.crashPoint.basisPoints - 1n
        : INITIAL_MULTIPLIER_BASIS_POINTS;

    return Multiplier.fromBasisPoints(
      calculatedBasisPoints > maxCashoutBasisPoints ? maxCashoutBasisPoints : calculatedBasisPoints,
    );
  }
}
