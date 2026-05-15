const bettingWindowRaw = import.meta.env.VITE_ROUND_BETTING_WINDOW_MS ?? "10000";
const parsedBettingWindow = Number.parseInt(bettingWindowRaw, 10);

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  gamesSocketPath:
    import.meta.env.VITE_GAMES_SOCKET_PATH ?? "/games/socket.io",
  /** Deve coincidir com `ROUND_BETTING_WINDOW_MS` do Game Service (UI do timer). */
  roundBettingWindowMs: Number.isFinite(parsedBettingWindow)
    ? Math.min(Math.max(parsedBettingWindow, 1_000), 120_000)
    : 10_000,
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM ?? "crash-game",
  keycloakClientId:
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "crash-game-client",
} as const;
