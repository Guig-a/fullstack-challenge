import { useCallback } from "react";

import { useAuth } from "../auth/AuthProvider";
import { ApiError } from "./apiClient";
import { walletApi } from "./walletApi";

export function useAuthenticatedWalletApi() {
  const { getAccessToken } = useAuth();

  const withToken = useCallback(async () => {
    const accessToken = await getAccessToken();

    return accessToken ? { accessToken } : undefined;
  }, [getAccessToken]);

  return {
    getMyWallet: async () => walletApi.getMyWallet(await withToken()),
    createWallet: async () => walletApi.createWallet(await withToken()),
    ensureMyWallet: async () => {
      const opts = await withToken();

      try {
        return await walletApi.getMyWallet(opts);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return walletApi.createWallet(opts);
        }

        throw error;
      }
    },
  };
}
