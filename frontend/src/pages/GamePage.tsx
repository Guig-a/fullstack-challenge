import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getApiErrorMessage } from "../api/apiErrorMessage";
import type { BetResponse } from "../api/gameTypes";
import { useAuthenticatedGameApi } from "../api/useAuthenticatedGameApi";
import { useAuthenticatedWalletApi } from "../api/useAuthenticatedWalletApi";
import { useAuth } from "../auth/AuthProvider";
import { useGameSocket } from "../hooks/useGameSocket";
import { useLiveMultiplierLabel } from "../hooks/useLiveMultiplierLabel";

export function GamePage() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const gameApi = useAuthenticatedGameApi();
  const walletApi = useAuthenticatedWalletApi();
  const { realtimeConnected, realtimeReconnecting } = useGameSocket(true);
  const userId = auth.user?.id;

  const [amountCentsInput, setAmountCentsInput] = useState("100");
  const [commandError, setCommandError] = useState<string | null>(null);

  const userLabel = auth.user?.username ?? auth.user?.email ?? "jogador";

  const currentRoundQuery = useQuery({
    queryKey: ["games", "rounds", "current"],
    queryFn: gameApi.getCurrentRound,
    refetchInterval: realtimeConnected ? false : 3_000,
  });

  const walletQuery = useQuery({
    queryKey: ["wallets", "me"],
    queryFn: walletApi.ensureMyWallet,
  });

  const betHistoryQuery = useQuery({
    queryKey: ["games", "bets", "me"],
    queryFn: gameApi.getMyBetHistory,
    refetchInterval: realtimeConnected ? false : 8_000,
  });

  const round = currentRoundQuery.data;
  const multiplierLabel = useLiveMultiplierLabel(round);
  const wallet = walletQuery.data;
  const betHistory = betHistoryQuery.data?.items ?? [];

  const currentBet = useMemo(
    () => findUserBetOnRound(round?.bets, userId, round?.id),
    [round?.bets, round?.id, userId],
  );

  const amountValidationError = validateAmountCents(amountCentsInput);

  const placeBetMutation = useMutation({
    mutationFn: async () => {
      const normalized = amountCentsInput.trim();
      const validation = validateAmountCents(normalized);
      if (validation) {
        throw new Error(validation);
      }

      return gameApi.placeBet({ amountCents: normalized });
    },
    onSuccess: () => {
      setCommandError(null);
      void invalidateGameplayQueries(queryClient);
    },
    onError: (error: unknown) => {
      setCommandError(getApiErrorMessage(error));
    },
  });

  const cashOutMutation = useMutation({
    mutationFn: gameApi.cashOut,
    onSuccess: () => {
      setCommandError(null);
      void invalidateGameplayQueries(queryClient);
    },
    onError: (error: unknown) => {
      setCommandError(getApiErrorMessage(error));
    },
  });

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

  const canPlaceBet =
    Boolean(round?.status === "betting") &&
    !placeBetMutation.isPending &&
    !amountValidationError;

  const canCashOut =
    Boolean(
      round?.status === "running" &&
        currentBet?.status === "placed" &&
        !cashOutMutation.isPending,
    );

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
              {multiplierLabel}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            {realtimeConnected ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                Tempo real
              </span>
            ) : null}
            {realtimeReconnecting ? (
              <span className="max-w-[14rem] rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-center text-xs font-medium text-amber-100">
                Tempo real desconectado — usando REST
              </span>
            ) : null}
            <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200">
              {round ? formatRoundStatus(round.status) : "Sincronizando"}
            </span>
          </div>
        </div>

        {currentBet ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            Aposta nesta rodada:{" "}
            <strong className="text-white">
              {formatCents(currentBet.amountCents)}
            </strong>{" "}
            — {formatBetStatus(currentBet.status)}
          </p>
        ) : null}

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
            Valor em centavos (inteiro, ex.: 100 = R$ 1,00)
          </label>
          <input
            id="amount"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg font-semibold outline-none ring-emerald-400/40 transition focus:ring-4"
            inputMode="numeric"
            value={amountCentsInput}
            onChange={(e) => {
              setAmountCentsInput(e.target.value);
              setCommandError(null);
            }}
          />
          {amountValidationError ? (
            <p className="mt-2 text-xs text-amber-200">{amountValidationError}</p>
          ) : null}
          <button
            className="mt-5 w-full rounded-2xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canPlaceBet}
            type="button"
            onClick={() => placeBetMutation.mutate()}
          >
            {placeBetMutation.isPending ? "Enviando..." : "Apostar"}
          </button>
          <button
            className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 font-bold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canCashOut}
            type="button"
            onClick={() => cashOutMutation.mutate()}
          >
            {cashOutMutation.isPending ? "Sacando..." : "Sacar"}
          </button>
          {commandError ? (
            <p className="mt-4 text-sm text-red-200">{commandError}</p>
          ) : null}
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

async function invalidateGameplayQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["games", "rounds", "current"] }),
    queryClient.invalidateQueries({ queryKey: ["wallets", "me"] }),
    queryClient.invalidateQueries({ queryKey: ["games", "bets", "me"] }),
  ]);
}

function findUserBetOnRound(
  bets: BetResponse[] | undefined,
  userId: string | undefined,
  roundId: string | undefined,
): BetResponse | undefined {
  if (!bets || !userId || !roundId) {
    return undefined;
  }

  return bets.find((bet) => bet.userId === userId && bet.roundId === roundId);
}

function validateAmountCents(raw: string): string | null {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return "Informe um valor em centavos.";
  }

  if (!/^\d+$/.test(trimmed)) {
    return "Use apenas dígitos inteiros (sem vírgula ou ponto).";
  }

  if (trimmed === "0" || /^0+$/.test(trimmed)) {
    return "O valor deve ser maior que zero.";
  }

  return null;
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
