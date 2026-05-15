import { useAuth } from "../auth/AuthProvider";

const stats = [
  { label: "Rodada", value: "Aguardando sync" },
  { label: "Multiplicador", value: "1.00x" },
  { label: "Status", value: "Betting" },
];

export function GamePage() {
  const auth = useAuth();
  const userLabel = auth.user?.username ?? auth.user?.email ?? "jogador";

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
              1.00x
            </h2>
          </div>
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200">
            Betting open
          </span>
        </div>

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
          <p className="mt-3 text-sm leading-6 text-slate-400">
            O próximo incremento conectará esta área ao endpoint autenticado de
            histórico de apostas e aos eventos WebSocket do backend.
          </p>
        </div>
      </aside>
    </section>
  );
}
