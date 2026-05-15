import { useQuery } from "@tanstack/react-query";

import { gameApi } from "../../api/gameApi";
import type {
  CurrentRoundResponse,
  RoundVerifyResponse,
} from "../../api/gameTypes";

type ProvablyFairPanelProps = {
  round: CurrentRoundResponse | undefined;
};

export function ProvablyFairPanel({ round }: ProvablyFairPanelProps) {
  const verifyQuery = useQuery({
    queryKey: ["games", "rounds", "verify", round?.id],
    queryFn: () => gameApi.verifyRound(round!.id),
    enabled: Boolean(round?.status === "crashed" && round.id),
  });

  if (!round) {
    return null;
  }

  const { proof } = round;
  const hashShort = truncateHash(proof.serverSeedHash, 14);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Provably fair
      </p>
      <p className="mt-2 break-all font-mono text-xs text-slate-300">
        <span className="text-slate-500">serverSeedHash </span>
        {hashShort}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Client seed:{" "}
        <span className="font-mono text-slate-400">{proof.clientSeed}</span> ·
        nonce:{" "}
        <span className="font-mono text-slate-400">{String(proof.nonce)}</span>
      </p>
      {round.status === "crashed" ? (
        <details className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-3">
          <summary className="cursor-pointer text-xs font-medium text-emerald-200">
            Dados de verificação (rodada finalizada)
          </summary>
          {verifyQuery.isLoading ? (
            <p className="mt-2 text-xs text-slate-500">Carregando verify…</p>
          ) : null}
          {verifyQuery.isError ? (
            <p className="mt-2 text-xs text-red-300">
              Não foi possível carregar o endpoint de verificação.
            </p>
          ) : null}
          {verifyQuery.data ? (
            <VerifyDetails data={verifyQuery.data} />
          ) : null}
        </details>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          A server seed completa é revelada após o crash; use o endpoint de
          verificação para auditar o resultado.
        </p>
      )}
    </div>
  );
}

function VerifyDetails({ data }: { data: RoundVerifyResponse }) {
  return (
    <dl className="mt-3 space-y-2 text-xs">
      <div>
        <dt className="text-slate-500">serverSeed</dt>
        <dd className="break-all font-mono text-slate-200">
          {data.serverSeed ?? "—"}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">hmac</dt>
        <dd className="break-all font-mono text-slate-400">{data.hmac}</dd>
      </div>
      <div>
        <dt className="text-slate-500">serverSeedHash</dt>
        <dd className="break-all font-mono text-slate-400">
          {data.serverSeedHash}
        </dd>
      </div>
    </dl>
  );
}

function truncateHash(hex: string, show: number): string {
  if (hex.length <= show + 4) {
    return hex;
  }

  return `${hex.slice(0, show)}…`;
}
