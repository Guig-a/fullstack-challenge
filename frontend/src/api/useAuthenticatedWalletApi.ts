import { useCallback } from "react";

import { useAuth } from "../auth/AuthProvider";
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
  };
}
