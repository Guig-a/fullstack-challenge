import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getApiErrorMessage } from "../api/apiErrorMessage";
import type { BetResponse } from "../api/gameTypes";
import { gameApi } from "../api/gameApi";
import { useAuthenticatedGameApi } from "../api/useAuthenticatedGameApi";
import { useAuthenticatedWalletApi } from "../api/useAuthenticatedWalletApi";
import { useAuth } from "../auth/AuthProvider";
import { CrashChart } from "../components/game/CrashChart";
import { CrashHistoryChips } from "../components/game/CrashHistoryChips";
import { ProvablyFairPanel } from "../components/game/ProvablyFairPanel";
import { RoundBetsList } from "../components/game/RoundBetsList";
import { useToast } from "../components/ToastProvider";
import { BET_MAX_CENTS, BET_MIN_CENTS } from "../config/betLimits";
import { formatPotentialCashoutBrl, formatCentsNumberStringAsBrl } from "../game/formatMoney";
import { useBettingCountdown } from "../hooks/useBettingCountdown";
import { useGameSocket } from "../hooks/useGameSocket";
import { useLiveMultiplierState } from "../hooks/useLiveMultiplier";

export function GamePage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const auth = useAuth();
  const gameApiHook = useAuthenticatedGameApi();
  const walletApi = useAuthenticatedWalletApi();
  const { realtimeConnected, realtimeReconnecting } = useGameSocket(true);
  const userId = auth.user?.id;

  const [amountCentsInput, setAmountCentsInput] = useState("100");

  const userLabel = auth.user?.username ?? auth.user?.email ?? "jogador";

  const currentRoundQuery = useQuery({
    queryKey: ["games", "rounds", "current"],
    queryFn: gameApiHook.getCurrentRound,
    refetchInterval: realtimeConnected ? false : 3_000,
  });

  const roundHistoryQuery = useQuery({
    queryKey: ["games", "rounds", "history", 20, 0],
    queryFn: () => gameApi.getRoundHistory(20, 0),
    refetchInterval: realtimeConnected ? false : 20_000,
  });

  const walletQuery = useQuery({
    queryKey: ["wallets", "me"],
    queryFn: walletApi.ensureMyWallet,
  });

  const betHistoryQuery = useQuery({
    queryKey: ["games", "bets", "me"],
    queryFn: gameApiHook.getMyBetHistory,
    refetchInterval: realtimeConnected ? false : 8_000,
  });

  const round = currentRoundQuery.data;
  const multiplierState = useLiveMultiplierState(round);
  const bettingSecondsLeft = useBettingCountdown(round);
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

      return gameApiHook.placeBet({ amountCents: normalized });
    },
    onSuccess: () => {
      showToast("Aposta enviada. Aguardando confirmação da carteira.", "success");
      void invalidateGameplayQueries(queryClient);
    },
    onError: (error: unknown) => {
      showToast(getApiErrorMessage(error), "error");
    },
  });

  const cashOutMutation = useMutation({
    mutationFn: gameApiHook.cashOut,
    onSuccess: (bet) => {
      const payout =
        bet.payoutCents != null
          ? formatCentsNumberStringAsBrl(bet.payoutCents)
          : "liquidação pendente";
      showToast(`Cashout registrado. Pagamento: ${payout}`, "success");
      void invalidateGameplayQueries(queryClient);
    },
    onError: (error: unknown) => {
      showToast(getApiErrorMessage(error), "error");
    },
  });

  const stats = [
    { label: "Rodada", value: round?.id.slice(0, 8) ?? "—" },
    { label: "Status", value: round ? formatRoundStatus(round.status) : "…" },
    {
      label: "Crash",
      value:
        round?.status === "crashed"
          ? formatBasisPoints(round.crashPointBasisPoints)
          : "Oculto até o fim",
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

  const potentialCashoutLabel =
    canCashOut && currentBet
      ? formatPotentialCashoutBrl(
          currentBet.amountCents,
          multiplierState.basisPoints,
        )
      : null;

  const chartStatus = round?.status ?? "betting";

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_min(100%,22rem)]">
      <div className="min-w-0 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-300">Painel do jogo</p>
              <p className="mt-2 text-sm text-slate-400">
                Olá, <strong className="text-slate-200">{userLabel}</strong>
              </p>
              {currentRoundQuery.isPending && !round ? (
                <div className="mt-4 h-16 w-48 animate-pulse rounded-xl bg-white/10" />
              ) : (
                <h2 className="mt-3 break-all text-4xl font-black tracking-tight sm:text-6xl md:text-7xl">
                  {multiplierState.label}
                </h2>
              )}
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
              Sua aposta:{" "}
              <strong className="text-white">
                {formatCentsNumberStringAsBrl(currentBet.amountCents)}
              </strong>{" "}
              — {formatBetStatus(currentBet.status)}
            </p>
          ) : null}

          {currentRoundQuery.isError ? (
            <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
              Não foi possível carregar a rodada atual.
            </div>
          ) : null}

          <div className="mt-6">
            <ProvablyFairPanel round={round} />
          </div>

          {round ? (
            <CrashChart
              crashPointBasisPointsStr={round.crashPointBasisPoints}
              currentBasisPoints={multiplierState.basisPoints}
              status={chartStatus}
            />
          ) : (
            <div className="mt-10 h-56 animate-pulse rounded-3xl bg-white/5" />
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
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

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-white">
            Apostas nesta rodada
          </h3>
          <div className="mt-4">
            <RoundBetsList
              bets={round?.bets ?? []}
              currentUserId={userId}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-white">
            Últimos crashes (~20)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Cores: baixo (vermelho) → alto (verde).
          </p>
          <div className="mt-4">
            {roundHistoryQuery.isLoading ? (
              <div className="h-10 animate-pulse rounded-xl bg-white/10" />
            ) : roundHistoryQuery.isError ? (
              <p className="text-sm text-red-200">Falha ao carregar histórico.</p>
            ) : (
              <CrashHistoryChips
                rounds={roundHistoryQuery.data?.items ?? []}
              />
            )}
          </div>
        </div>
      </div>

      <aside className="min-w-0 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-medium text-slate-400">Saldo</p>
          {walletQuery.isLoading && !wallet ? (
            <div className="mt-3 h-10 w-40 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <p className="mt-2 text-3xl font-black tabular-nums">
              {wallet ? `R$ ${wallet.balance}` : "—"}
            </p>
          )}
          {walletQuery.isError ? (
            <p className="mt-3 text-sm text-red-200">
              Não foi possível carregar a carteira.
            </p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-semibold">Aposta</h3>
          {round?.status === "betting" && bettingSecondsLeft != null ? (
            <p className="mt-3 text-sm font-medium text-amber-200">
              Fecha em{" "}
              <span className="tabular-nums text-lg text-white">
                {bettingSecondsLeft}s
              </span>
            </p>
          ) : null}
          <label className="mt-5 block text-sm text-slate-400" htmlFor="amount">
            Valor (centavos): mín. {String(BET_MIN_CENTS)} (R$&nbsp;1,00), máx.{" "}
            {String(BET_MAX_CENTS)} (R$&nbsp;1.000,00)
          </label>
          <input
            id="amount"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg font-semibold outline-none ring-emerald-400/40 transition focus:ring-4"
            inputMode="numeric"
            value={amountCentsInput}
            onChange={(e) => setAmountCentsInput(e.target.value)}
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
            {placeBetMutation.isPending ? "Enviando…" : "Apostar"}
          </button>
          <button
            className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 font-bold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canCashOut}
            type="button"
            onClick={() => cashOutMutation.mutate()}
          >
            {cashOutMutation.isPending ? "Sacando…" : "Sacar agora"}
          </button>
          {potentialCashoutLabel ? (
            <p className="mt-3 text-center text-sm text-emerald-200/90">
              Ganho potencial agora:{" "}
              <strong className="text-emerald-100">{potentialCashoutLabel}</strong>{" "}
              <span className="text-slate-500">(estimativa)</span>
            </p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-semibold">Suas apostas recentes</h3>
          {betHistoryQuery.isLoading ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/10" />
          ) : betHistoryQuery.isError ? (
            <p className="mt-3 text-sm text-red-200">
              Não foi possível carregar o histórico.
            </p>
          ) : betHistory.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Nenhuma aposta ainda.</p>
          ) : (
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {betHistory.slice(0, 8).map((bet) => (
                <div
                  key={bet.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">
                      {formatCentsNumberStringAsBrl(bet.amountCents)}
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
          )}
        </div>
      </aside>
    </section>
  );
}

async function invalidateGameplayQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["games", "rounds", "current"] }),
    queryClient.invalidateQueries({ queryKey: ["games", "rounds", "history"] }),
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

  let cents: bigint;

  try {
    cents = BigInt(trimmed);
  } catch {
    return "Valor inválido.";
  }

  if (cents < BET_MIN_CENTS || cents > BET_MAX_CENTS) {
    return `O valor deve estar entre ${BET_MIN_CENTS} e ${BET_MAX_CENTS} centavos (R$ 1,00 a R$ 1.000,00).`;
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
