import { apiRequest, type ApiClientOptions } from "./apiClient";
import type {
  BetResponse,
  CurrentRoundResponse,
  PlayerBetHistoryResponse,
  PlaceBetRequest,
} from "./gameTypes";

export const gameApi = {
  getCurrentRound(options?: ApiClientOptions) {
    return apiRequest<CurrentRoundResponse>("/games/rounds/current", {}, options);
  },

  placeBet(input: PlaceBetRequest, options?: ApiClientOptions) {
    return apiRequest<BetResponse>(
      "/games/bets",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      options,
    );
  },

  cashOut(betId: string, options?: ApiClientOptions) {
    return apiRequest<BetResponse>(
      `/games/bets/${betId}/cash-out`,
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
