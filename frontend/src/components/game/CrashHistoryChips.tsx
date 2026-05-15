import type { CurrentRoundResponse } from "../../api/gameTypes";
import { crashMultiplierHeatClass } from "../../game/crashHeat";

type CrashHistoryChipsProps = {
  rounds: CurrentRoundResponse[];
};

export function CrashHistoryChips({ rounds }: CrashHistoryChipsProps) {
  const crashed = rounds
    .filter((r) => r.status === "crashed")
    .sort(
      (a, b) =>
        (b.crashedAt ? Date.parse(b.crashedAt) : 0) -
        (a.crashedAt ? Date.parse(a.crashedAt) : 0),
    )
    .slice(0, 20);

  if (crashed.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Aguardando histórico de crashes…
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {crashed.map((r) => {
        let bp: bigint;

        try {
          bp = BigInt(r.crashPointBasisPoints);
        } catch {
          return null;
        }

        const label = `${(Number(bp) / 100).toFixed(2)}x`;

        return (
          <span
            key={r.id}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${crashMultiplierHeatClass(bp)}`}
            title={`Rodada ${r.id.slice(0, 8)}`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
