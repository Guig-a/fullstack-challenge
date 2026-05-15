import { useQuery } from "@tanstack/react-query";

import { useAuthenticatedGameApi } from "../api/useAuthenticatedGameApi";
import { useAuthenticatedWalletApi } from "../api/useAuthenticatedWalletApi";
import { useAuth } from "../auth/AuthProvider";

export function GamePage() {
  const auth = useAuth();
  const gameApi = useAuthenticatedGameApi();
  const walletApi = useAuthenticatedWalletApi();
  const userLabel = auth.user?.username ?? auth.user?.email ?? "jogador";

  const currentRoundQuery = useQuery({
    queryKey: ["games", "rounds", "current"],
    queryFn: gameApi.getCurrentRound,
    refetchInterval: 2_000,
  });

  const walletQuery = useQuery({
    queryKey: ["wallets", "me"],
    queryFn: walletApi.getMyWallet,
  });

  const betHistoryQuery = useQuery({
    queryKey: ["games", "bets", "me"],
    queryFn: gameApi.getMyBetHistory,
    refetchInterval: 5_000,
  });

  const round = currentRoundQuery.data;
  const wallet = walletQuery.data;
  const betHistory = betHistoryQuery.data?.items ?? [];
  const stats = [
    { label: "Rodada", value: round?.id.slice(0, 8) ?? "Carregando" },
    { label: "Status", value: round ? formatRoundStatus(round.status) : "..." },
    {
      label: "Crash",
      value:
        round?.status === "crashed"
          ? formatBasisPoints(round.crashPointBasisPoints)
          : "Oculto",
    },
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              Painel do jogo
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Sessão autenticada como {userLabel}
            </p>
            <h2 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
              {round?.status === "crashed"
                ? formatBasisPoints(round.crashPointBasisPoints)
                : "1.00x"}
            </h2>
          </div>
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200">
            {round ? formatRoundStatus(round.status) : "Sincronizando"}
          </span>
        </div>

        {currentRoundQuery.isError ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
            Não foi possível carregar a rodada atual.
          </div>
        ) : null}

        <div className="mt-10 h-56 rounded-3xl border border-dashed border-emerald-300/30 bg-slate-900/80 p-6">
          <div className="flex h-full items-end">
            <div className="h-1/3 w-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-transparent shadow-lg shadow-emerald-500/20" />
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                {stat.label}
              </p>
              <p className="mt-2 text-lg font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-medium text-slate-400">Saldo</p>
          <p className="mt-2 text-3xl font-black">
            {wallet ? `R$ ${wallet.balance}` : "Carregando"}
          </p>
          {walletQuery.isError ? (
            <p className="mt-3 text-sm text-red-200">
              Não foi possível carregar a carteira.
            </p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-semibold">Aposta</h3>
          <label className="mt-5 block text-sm text-slate-400" htmlFor="amount">
            Valor em centavos
          </label>
          <input
            id="amount"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg font-semibold outline-none ring-emerald-400/40 transition focus:ring-4"
            defaultValue="100"
            inputMode="numeric"
          />
          <button
            className="mt-5 w-full rounded-2xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
            type="button"
          >
            Apostar
          </button>
          <button
            className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 font-bold text-slate-100 transition hover:bg-white/10"
            type="button"
          >
            Sacar
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-semibold">Histórico</h3>
          {betHistoryQuery.isLoading ? (
            <p className="mt-3 text-sm text-slate-400">Carregando apostas...</p>
          ) : null}
          {betHistoryQuery.isError ? (
            <p className="mt-3 text-sm text-red-200">
              Não foi possível carregar o histórico.
            </p>
          ) : null}
          {!betHistoryQuery.isLoading && betHistory.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Nenhuma aposta encontrada para este jogador.
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {betHistory.slice(0, 5).map((bet) => (
              <div
                key={bet.id}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {formatCents(bet.amountCents)}
                  </span>
                  <span className="text-slate-400">
                    {formatBetStatus(bet.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(bet.placedAt).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}

function formatRoundStatus(status: string) {
  const statuses: Record<string, string> = {
    betting: "Apostas abertas",
    running: "Rodando",
    crashed: "Crash",
  };

  return statuses[status] ?? status;
}

function formatBetStatus(status: string) {
  const statuses: Record<string, string> = {
    pending_debit: "Débito pendente",
    placed: "Confirmada",
    cashed_out: "Cashout",
    lost: "Perdida",
    rejected: "Rejeitada",
  };

  return statuses[status] ?? status;
}

function formatBasisPoints(value: string) {
  return `${(Number(value) / 100).toFixed(2)}x`;
}

function formatCents(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) / 100);
}
