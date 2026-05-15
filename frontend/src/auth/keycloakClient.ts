import Keycloak from "keycloak-js";

import { appConfig } from "../config/appConfig";

export const keycloak = new Keycloak({
  url: appConfig.keycloakUrl,
  realm: appConfig.keycloakRealm,
  clientId: appConfig.keycloakClientId,
});

let initPromise: Promise<boolean> | null = null;

export function initKeycloak() {
  initPromise ??= keycloak.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });

  return initPromise;
}
