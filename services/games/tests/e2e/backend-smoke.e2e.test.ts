import { describe, expect, test } from "bun:test";

type WalletResponse = {
  id: string;
  userId: string;
  balanceCents: string;
  balance: string;
};

type RoundResponse = {
  id: string;
  status: "betting" | "running" | "crashed";
};

type BetResponse = {
  id: string;
  roundId: string;
  userId: string;
  amountCents: string;
  status: "pending_debit" | "placed" | "cashed_out" | "lost" | "rejected";
};

type PlayerBetHistoryResponse = {
  items: BetResponse[];
  limit: number;
  offset: number;
};

const config = {
  gatewayUrl: process.env.E2E_GATEWAY_URL ?? "http://localhost:8000",
  keycloakTokenUrl:
    process.env.E2E_KEYCLOAK_TOKEN_URL ??
    "http://localhost:8080/realms/crash-game/protocol/openid-connect/token",
  clientId: process.env.E2E_KEYCLOAK_CLIENT_ID ?? "crash-game-client",
  username: process.env.E2E_PLAYER_USERNAME ?? "player",
  password: process.env.E2E_PLAYER_PASSWORD ?? "player123",
  playerUserId: process.env.E2E_PLAYER_USER_ID ?? "00000000-0000-0000-0000-000000000001",
};

describe("backend smoke E2E", () => {
  test(
    "authenticates, reads seeded wallet, places a bet and lists player history",
    async () => {
      const token = await getPlayerToken();

      const wallet = await requestJson<WalletResponse>("/wallets/me", {
        headers: authHeaders(token),
      });

      expect(wallet.userId).toBe(config.playerUserId);
      expect(BigInt(wallet.balanceCents)).toBeGreaterThanOrEqual(100n);

      const round = await waitForBettingRound();
      const placedBet = await requestJson<BetResponse>("/games/bet", {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "content-type": "application/json",
        },
        body: JSON.stringify({ amountCents: "100" }),
      });

      expect(placedBet.roundId).toBe(round.id);
      expect(placedBet.userId).toBe(config.playerUserId);
      expect(placedBet.amountCents).toBe("100");
      expect(["pending_debit", "placed"]).toContain(placedBet.status);

      const confirmedBet = await waitForPlayerBetStatus(token, placedBet.id, "placed");

      expect(confirmedBet.amountCents).toBe("100");
      expect(confirmedBet.roundId).toBe(round.id);
    },
    30_000,
  );
});

async function getPlayerToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: config.clientId,
    username: config.username,
    password: config.password,
  });

  const response = await fetch(config.keycloakTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to get Keycloak token: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    throw new Error("Keycloak token response did not include access_token");
  }

  return payload.access_token;
}

async function waitForBettingRound(): Promise<RoundResponse> {
  return retryUntil(async () => {
    const round = await requestJson<RoundResponse>("/games/rounds/current");

    return round.status === "betting" ? round : null;
  }, "current round to enter betting state");
}

async function waitForPlayerBetStatus(token: string, betId: string, status: BetResponse["status"]): Promise<BetResponse> {
  return retryUntil(async () => {
    const history = await requestJson<PlayerBetHistoryResponse>("/games/bets/me?limit=20&offset=0", {
      headers: authHeaders(token),
    });
    const bet = history.items.find((item) => item.id === betId);

    return bet?.status === status ? bet : null;
  }, `bet ${betId} to reach ${status}`);
}

async function retryUntil<T>(operation: () => Promise<T | null>, description: string): Promise<T> {
  const deadline = Date.now() + 20_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const result = await operation();

      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${String(lastError)}` : ""}`);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.gatewayUrl}${path}`, init);

  if (!response.ok) {
    throw new Error(`Request ${path} failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as T;
}

function authHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
  };
}
