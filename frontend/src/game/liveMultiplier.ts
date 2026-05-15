/**
 * Espelha `ElapsedTimeCurrentMultiplierProvider` do Game Service para animar o
 * multiplicador localmente durante `running`, sem polling da REST.
 */
const INITIAL_MULTIPLIER_BASIS_POINTS = 100n;
const BASIS_POINTS_PER_SECOND = 10n;

export function getLiveMultiplierBasisPoints(
  startedAtIso: string | null,
  crashPointBasisPointsStr: string,
  nowMs: number,
): bigint {
  if (!startedAtIso) {
    return INITIAL_MULTIPLIER_BASIS_POINTS;
  }

  const startedAt = Date.parse(startedAtIso);
  const elapsedMilliseconds = BigInt(Math.max(0, nowMs - startedAt));
  const elapsedBasisPoints =
    (elapsedMilliseconds * BASIS_POINTS_PER_SECOND) / 1_000n;
  const calculatedBasisPoints =
    INITIAL_MULTIPLIER_BASIS_POINTS + elapsedBasisPoints;

  const crashPointBasisPoints = BigInt(crashPointBasisPointsStr);
  const maxCashoutBasisPoints =
    crashPointBasisPoints > INITIAL_MULTIPLIER_BASIS_POINTS
      ? crashPointBasisPoints - 1n
      : INITIAL_MULTIPLIER_BASIS_POINTS;

  return calculatedBasisPoints > maxCashoutBasisPoints
    ? maxCashoutBasisPoints
    : calculatedBasisPoints;
}

export function formatBasisPointsAsMultiplier(basisPoints: bigint): string {
  const units = basisPoints / 100n;
  const cents = basisPoints % 100n;

  return `${units}.${cents.toString().padStart(2, "0")}x`;
}
