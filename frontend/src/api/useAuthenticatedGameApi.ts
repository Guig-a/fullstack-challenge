import { useCallback } from "react";

import { useAuth } from "../auth/AuthProvider";
import { gameApi } from "./gameApi";
import type { PlaceBetRequest } from "./gameTypes";

export function useAuthenticatedGameApi() {
  const { getAccessToken } = useAuth();

  const withToken = useCallback(async () => {
    const accessToken = await getAccessToken();

    return accessToken ? { accessToken } : undefined;
  }, [getAccessToken]);

  return {
    getCurrentRound: async () => gameApi.getCurrentRound(await withToken()),
    placeBet: async (input: PlaceBetRequest) =>
      gameApi.placeBet(input, await withToken()),
    cashOut: async (betId: string) => gameApi.cashOut(betId, await withToken()),
    getMyBetHistory: async () => gameApi.getMyBetHistory(await withToken()),
  };
}
