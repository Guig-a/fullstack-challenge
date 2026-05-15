import { apiRequest, type ApiClientOptions } from "./apiClient";
import type {
  BetResponse,
  CurrentRoundResponse,
  PlayerBetHistoryResponse,
  PlaceBetRequest,
  RoundHistoryResponse,
  RoundVerifyResponse,
} from "./gameTypes";

export const gameApi = {
  getCurrentRound(options?: ApiClientOptions) {
    return apiRequest<CurrentRoundResponse>("/games/rounds/current", {}, options);
  },

  getRoundHistory(limit: number, offset: number, options?: ApiClientOptions) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return apiRequest<RoundHistoryResponse>(
      `/games/rounds/history?${params.toString()}`,
      {},
      options,
    );
  },

  verifyRound(roundId: string, options?: ApiClientOptions) {
    return apiRequest<RoundVerifyResponse>(
      `/games/rounds/${encodeURIComponent(roundId)}/verify`,
      {},
      options,
    );
  },

  placeBet(input: PlaceBetRequest, options?: ApiClientOptions) {
    return apiRequest<BetResponse>(
      "/games/bet",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      options,
    );
  },

  cashOut(options?: ApiClientOptions) {
    return apiRequest<BetResponse>(
      "/games/bet/cashout",
      {
        method: "POST",
      },
      options,
    );
  },

  getMyBetHistory(options?: ApiClientOptions) {
    return apiRequest<PlayerBetHistoryResponse>("/games/bets/me", {}, options);
  },
};
