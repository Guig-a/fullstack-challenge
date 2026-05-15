import { apiRequest, type ApiClientOptions } from "./apiClient";
import type { WalletResponse } from "./walletTypes";

export const walletApi = {
  getMyWallet(options?: ApiClientOptions) {
    return apiRequest<WalletResponse>("/wallets/me", {}, options);
  },

  createWallet(options?: ApiClientOptions) {
    return apiRequest<WalletResponse>(
      "/wallets",
      {
        method: "POST",
      },
      options,
    );
  },
};
