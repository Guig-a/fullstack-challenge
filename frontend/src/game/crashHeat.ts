/** Classes Tailwind para crash baixo (vermelho) → alto (verde). */
export function crashMultiplierHeatClass(basisPoints: bigint): string {
  const min = 100n;
  const max = 800n;
  const clamped =
    basisPoints < min ? min : basisPoints > max ? max : basisPoints;
  const t = Number((clamped - min) * 100n) / Number(max - min);
  if (t < 33) {
    return "border-red-500/50 bg-red-500/20 text-red-100";
  }
  if (t < 66) {
    return "border-amber-400/50 bg-amber-400/15 text-amber-100";
  }
  return "border-emerald-400/50 bg-emerald-400/15 text-emerald-100";
}
