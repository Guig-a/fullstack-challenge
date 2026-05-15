import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { initKeycloak, keycloak } from "./keycloakClient";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthUser = {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
};

type AuthContextValue = {
  status: AuthStatus;
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const syncSession = useCallback(() => {
    const authenticated = keycloak.authenticated === true;

    setStatus(authenticated ? "authenticated" : "anonymous");
    setToken(authenticated ? (keycloak.token ?? null) : null);
    setUser(authenticated ? getUserFromToken() : null);
  }, []);

  useEffect(() => {
    let mounted = true;

    initKeycloak()
      .then(() => {
        if (mounted) {
          syncSession();
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus("anonymous");
          setToken(null);
          setUser(null);
        }
      });

    keycloak.onAuthRefreshSuccess = syncSession;
    keycloak.onAuthLogout = syncSession;
    keycloak.onTokenExpired = () => {
      void keycloak.updateToken(30).then(syncSession).catch(syncSession);
    };

    return () => {
      mounted = false;
    };
  }, [syncSession]);

  const login = useCallback(async () => {
    await keycloak.login({
      redirectUri: `${window.location.origin}/game`,
    });
  }, []);

  const logout = useCallback(async () => {
    await keycloak.logout({
      redirectUri: `${window.location.origin}/login`,
    });
  }, []);

  const getAccessToken = useCallback(async () => {
    if (keycloak.authenticated !== true) {
      return null;
    }

    await keycloak.updateToken(30);
    syncSession();

    return keycloak.token ?? null;
  }, [syncSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isAuthenticated: status === "authenticated",
      user,
      token,
      login,
      logout,
      getAccessToken,
    }),
    [getAccessToken, login, logout, status, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

function getUserFromToken(): AuthUser {
  const tokenParsed = keycloak.tokenParsed ?? {};

  return {
    id: typeof tokenParsed.sub === "string" ? tokenParsed.sub : undefined,
    username:
      typeof tokenParsed.preferred_username === "string"
        ? tokenParsed.preferred_username
        : undefined,
    email: typeof tokenParsed.email === "string" ? tokenParsed.email : undefined,
    name: typeof tokenParsed.name === "string" ? tokenParsed.name : undefined,
  };
}
