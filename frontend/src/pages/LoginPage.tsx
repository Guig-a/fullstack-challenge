import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { appConfig } from "../config/appConfig";

export function LoginPage() {
  const auth = useAuth();

  if (auth.isAuthenticated) {
    return <Navigate to="/game" replace />;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
        <p className="text-sm font-medium text-emerald-300">Autenticação</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight">
          Entrada preparada para Keycloak
        </h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Use o fluxo OAuth público do Keycloak para obter um JWT válido e
          chamar os serviços protegidos via Kong.
        </p>

        <button
          className="mt-8 rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70"
          disabled={auth.status === "loading"}
          type="button"
          onClick={() => void auth.login()}
        >
          Entrar com Keycloak
        </button>

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
          Usuário de teste
        </h3>
        <p className="mt-3 text-sm leading-6 text-emerald-50/80">
          O realm local possui o jogador `player`. Após login, o token fica
          disponível no provider de autenticação para as chamadas REST do jogo e
          da wallet.
        </p>
      </aside>
    </section>
  );
}
