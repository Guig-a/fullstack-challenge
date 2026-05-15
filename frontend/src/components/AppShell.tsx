import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { appConfig } from "../config/appConfig";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-full px-4 py-2 text-sm font-medium transition",
    isActive
      ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
      : "text-slate-300 hover:bg-white/10 hover:text-white",
  ].join(" ");

export function AppShell() {
  const auth = useAuth();
  const userLabel = auth.user?.username ?? auth.user?.email ?? "Jogador";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <header className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
              Crash Challenge
            </p>
            <h1 className="text-xl font-semibold">Provably fair crash</h1>
          </div>

          <nav className="flex items-center gap-2">
            <NavLink to="/game" className={navLinkClassName}>
              Jogo
            </NavLink>
            {auth.isAuthenticated ? (
              <button
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                type="button"
                onClick={() => void auth.logout()}
              >
                Sair de {userLabel}
              </button>
            ) : (
              <NavLink to="/login" className={navLinkClassName}>
                Login
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>

      <footer className="relative mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 pb-8 text-xs text-slate-500">
        <span>API Gateway: {appConfig.apiBaseUrl}</span>
        <span>Realm: {appConfig.keycloakRealm}</span>
      </footer>
    </div>
  );
}
