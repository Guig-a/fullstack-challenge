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
  startedAt: string | null;
  crashedAt: string | null;
};

type BetResponse = {
  id: string;
  roundId: string;
  userId: string;
  amountCents: string;
  status: "pending_debit" | "placed" | "cashed_out" | "lost" | "rejected";
  payoutCents: string | null;
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

describe("backend gameplay E2E", () => {
  test(
    "covers wallet, bet confirmation, duplicate rejection, cashout and crash loss",
    async () => {
      const token = await getPlayerToken();
      const initialWallet = await getWallet(token);

      expect(initialWallet.userId).toBe(config.playerUserId);
      expect(BigInt(initialWallet.balanceCents)).toBeGreaterThanOrEqual(200n);

      const cashoutBet = await placeBetInNextBettingRound(token, "100");
      const confirmedCashoutBet = await waitForPlayerBetStatus(token, cashoutBet.id, "placed");
      const duplicateResponse = await request("/games/bet", {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "content-type": "application/json",
        },
        body: JSON.stringify({ amountCents: "100" }),
      });

      expect(duplicateResponse.status).toBe(409);

      await waitForRoundStatus(confirmedCashoutBet.roundId, "running");
      await delay(500);

      const cashedOutBet = await requestJson<BetResponse>("/games/bet/cashout", {
        method: "POST",
        headers: authHeaders(token),
      });

      expect(cashedOutBet.id).toBe(confirmedCashoutBet.id);
      expect(cashedOutBet.status).toBe("cashed_out");
      expect(BigInt(cashedOutBet.payoutCents ?? "0")).toBeGreaterThanOrEqual(100n);

      const walletAfterCashout = await waitForWalletBalanceAtLeast(token, BigInt(initialWallet.balanceCents));
      const lossBet = await placeBetInNextBettingRound(token, "100", confirmedCashoutBet.roundId);
      const confirmedLossBet = await waitForPlayerBetStatus(token, lossBet.id, "placed");
      const walletAfterLossDebit = await waitForWalletBalanceAtMost(
        token,
        BigInt(walletAfterCashout.balanceCents) - 100n,
      );

      expect(BigInt(walletAfterLossDebit.balanceCents)).toBeLessThanOrEqual(BigInt(walletAfterCashout.balanceCents) - 100n);

      const lostBet = await waitForPlayerBetStatus(token, confirmedLossBet.id, "lost", 90_000);
      const walletAfterCrash = await getWallet(token);

      expect(lostBet.payoutCents).toBeNull();
      expect(walletAfterCrash.balanceCents).toBe(walletAfterLossDebit.balanceCents);
    },
    180_000,
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

async function getWallet(token: string): Promise<WalletResponse> {
  return requestJson<WalletResponse>("/wallets/me", {
    headers: authHeaders(token),
  });
}

async function placeBetInNextBettingRound(
  token: string,
  amountCents: string,
  previousRoundId?: string,
): Promise<BetResponse> {
  const bet = await retryUntil(
    async () => {
      const round = await requestJson<RoundResponse>("/games/rounds/current");

      if (round.status !== "betting" || round.id === previousRoundId) {
        return null;
      }

      const response = await request("/games/bet", {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "content-type": "application/json",
        },
        body: JSON.stringify({ amountCents }),
      });

      if (response.status === 409) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Request /games/bet failed: ${response.status} ${await response.text()}`);
      }

      const placedBet = (await response.json()) as BetResponse;

      expect(placedBet.roundId).toBe(round.id);
      expect(placedBet.userId).toBe(config.playerUserId);
      expect(placedBet.amountCents).toBe(amountCents);

      return placedBet;
    },
    "betting round to accept a bet",
    {
      timeoutMs: 120_000,
    },
  );

  if (!bet) {
    throw new Error("Timed out waiting for betting round to accept a bet");
  }

  return bet;
}

async function waitForRoundStatus(roundId: string, status: RoundResponse["status"]): Promise<RoundResponse> {
  const round = await retryUntil(async () => {
    const currentRound = await requestJson<RoundResponse>("/games/rounds/current");

    return currentRound.id === roundId && currentRound.status === status ? currentRound : null;
  }, `round ${roundId} to reach ${status}`);

  if (!round) {
    throw new Error(`Timed out waiting for round ${roundId} to reach ${status}`);
  }

  return round;
}

async function waitForPlayerBetStatus(
  token: string,
  betId: string,
  status: BetResponse["status"],
  timeoutMs = 20_000,
): Promise<BetResponse> {
  const bet = await retryUntil(
    async () => {
      const history = await requestJson<PlayerBetHistoryResponse>("/games/bets/me?limit=20&offset=0", {
        headers: authHeaders(token),
      });
      const playerBet = history.items.find((item) => item.id === betId);

      return playerBet?.status === status ? playerBet : null;
    },
    `bet ${betId} to reach ${status}`,
    {
      timeoutMs,
    },
  );

  if (!bet) {
    throw new Error(`Timed out waiting for bet ${betId} to reach ${status}`);
  }

  return bet;
}

async function waitForWalletBalanceAtLeast(token: string, balanceCents: bigint): Promise<WalletResponse> {
  const wallet = await retryUntil(async () => {
    const currentWallet = await getWallet(token);

    return BigInt(currentWallet.balanceCents) >= balanceCents ? currentWallet : null;
  }, `wallet balance to be at least ${balanceCents.toString()}`);

  if (!wallet) {
    throw new Error(`Timed out waiting for wallet balance to be at least ${balanceCents.toString()}`);
  }

  return wallet;
}

async function waitForWalletBalanceAtMost(token: string, balanceCents: bigint): Promise<WalletResponse> {
  const wallet = await retryUntil(async () => {
    const currentWallet = await getWallet(token);

    return BigInt(currentWallet.balanceCents) <= balanceCents ? currentWallet : null;
  }, `wallet balance to be at most ${balanceCents.toString()}`);

  if (!wallet) {
    throw new Error(`Timed out waiting for wallet balance to be at most ${balanceCents.toString()}`);
  }

  return wallet;
}

async function retryUntil<T>(
  operation: () => Promise<T | null>,
  description: string,
  options: { timeoutMs?: number } = {},
): Promise<T | null> {
  const deadline = Date.now() + (options.timeoutMs ?? 20_000);
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

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${String(lastError)}` : ""}`);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);

  if (!response.ok) {
    throw new Error(`Request ${path} failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as T;
}

function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${config.gatewayUrl}${path}`, init);
}

function authHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
