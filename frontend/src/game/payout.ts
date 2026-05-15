/** Payout em centavos: `apostaCentavos * multiplicadorBp / 100` (basis points). */
export function payoutCentsForCashout(
  amountCentsStr: string,
  multiplierBasisPoints: bigint,
): bigint {
  const amount = BigInt(amountCentsStr);

  return (amount * multiplierBasisPoints) / 100n;
}
