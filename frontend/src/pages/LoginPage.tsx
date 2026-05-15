import { appConfig } from "../config/appConfig";

export function LoginPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
        <p className="text-sm font-medium text-emerald-300">Autenticação</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight">
          Entrada preparada para Keycloak
        </h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Este primeiro shell deixa a tela pronta para conectar o fluxo OAuth
          com o realm do desafio e trocar o token JWT com os serviços via Kong.
        </p>

        <div className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Keycloak URL</span>
            <strong className="text-right font-medium text-slate-100">
              {appConfig.keycloakUrl}
            </strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Realm</span>
            <strong className="font-medium text-slate-100">
              {appConfig.keycloakRealm}
            </strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Client</span>
            <strong className="font-medium text-slate-100">
              {appConfig.keycloakClientId}
            </strong>
          </div>
        </div>
      </div>

      <aside className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
        <h3 className="text-lg font-semibold text-emerald-100">
          Próxima etapa
        </h3>
        <p className="mt-3 text-sm leading-6 text-emerald-50/80">
          Implementar o adaptador de autenticação, persistir sessão em memória
          e anexar o bearer token nas chamadas REST do jogo e da wallet.
        </p>
      </aside>
    </section>
  );
}
