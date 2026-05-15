import type { BetResponse } from "../../api/gameTypes";
import { formatCentsNumberStringAsBrl } from "../../game/formatMoney";

type BetStatusLabel = BetResponse["status"];

type RoundBetsListProps = {
  bets: BetResponse[];
  currentUserId?: string;
};

export function RoundBetsList({ bets, currentUserId }: RoundBetsListProps) {
  if (bets.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma aposta nesta rodada ainda.
      </p>
    );
  }

  const sorted = [...bets].sort(
    (a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt),
  );

  return (
    <div className="max-h-64 overflow-y-auto rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-950/95 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th abbr="Jogador" className="px-3 py-2 font-medium">
              Jogador
            </th>
            <th className="px-3 py-2 font-medium">Valor</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((bet) => {
            const isYou = bet.userId === currentUserId;

            return (
              <tr
                key={bet.id}
                className={
                  isYou
                    ? "border-t border-emerald-500/30 bg-emerald-500/10"
                    : "border-t border-white/5"
                }
              >
                <td className="px-3 py-2 font-mono text-xs text-slate-300">
                  {formatPlayerLabel(bet.userId)}
                  {isYou ? (
                    <span className="ml-2 rounded bg-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-100">
                      você
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-medium">
                  {formatCentsNumberStringAsBrl(bet.amountCents)}
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {formatBetStatus(bet.status)}
                  {bet.status === "cashed_out" && bet.cashoutMultiplierBasisPoints
                    ? ` @ ${formatMult(bet.cashoutMultiplierBasisPoints)}`
                    : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatPlayerLabel(userId: string): string {
  if (userId.length <= 10) {
    return userId;
  }

  return `${userId.slice(0, 6)}…${userId.slice(-4)}`;
}

function formatMult(bp: string): string {
  try {
    const n = BigInt(bp);

    return `${(Number(n) / 100).toFixed(2)}x`;
  } catch {
    return "—";
  }
}

function formatBetStatus(status: BetStatusLabel): string {
  const labels: Record<BetStatusLabel, string> = {
    pending_debit: "Débito pendente",
    placed: "Ativa",
    cashed_out: "Cashout",
    lost: "Perdida",
    rejected: "Rejeitada",
  };

  return labels[status] ?? status;
}
