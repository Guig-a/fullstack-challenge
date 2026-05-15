export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM ?? "crash",
  keycloakClientId:
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "crash-game-client",
} as const;
