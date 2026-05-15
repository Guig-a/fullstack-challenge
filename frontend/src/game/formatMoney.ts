import { payoutCentsForCashout } from "./payout";

export function formatCentsBrl(cents: bigint): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(cents) / 100);
}

export function formatCentsNumberStringAsBrl(amountCentsStr: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(amountCentsStr) / 100);
}

export function formatPotentialCashoutBrl(
  amountCentsStr: string,
  multiplierBasisPoints: bigint,
): string {
  const payout = payoutCentsForCashout(amountCentsStr, multiplierBasisPoints);

  return formatCentsBrl(payout);
}
