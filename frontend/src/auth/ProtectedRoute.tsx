import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-300">
        Verificando sessão...
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
