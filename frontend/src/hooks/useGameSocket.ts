import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { appConfig } from "../config/appConfig";

type GameSocketStatus = "idle" | "connected" | "disconnected";

/**
 * Conecta ao Socket.IO do Game via Kong (`path` `/games/socket.io`) e
 * invalida queries do TanStack Query conforme eventos do servidor.
 */
export function useGameSocket(enabled: boolean) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<GameSocketStatus>("idle");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const invalidateRound = () => {
      void queryClient.invalidateQueries({
        queryKey: ["games", "rounds", "current"],
      });
    };

    const invalidateMyBets = () => {
      void queryClient.invalidateQueries({
        queryKey: ["games", "bets", "me"],
      });
    };

    const invalidateWallet = () => {
      void queryClient.invalidateQueries({ queryKey: ["wallets", "me"] });
    };

    const socket: Socket = io(appConfig.apiBaseUrl, {
      path: appConfig.gamesSocketPath,
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    const onConnect = () => {
      setStatus("connected");
      invalidateRound();
    };

    const onDisconnect = () => {
      setStatus("disconnected");
    };

    const onConnectError = () => {
      setStatus("disconnected");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("round.created", invalidateRound);
    socket.on("round.started", invalidateRound);
    socket.on("round.crashed", invalidateRound);

    socket.on("bet.placed", () => {
      invalidateRound();
      invalidateMyBets();
    });

    socket.on("bet.confirmed", () => {
      invalidateRound();
      invalidateMyBets();
      invalidateWallet();
    });

    socket.on("bet.cashed_out", () => {
      invalidateRound();
      invalidateMyBets();
      invalidateWallet();
    });

    socket.on("bet.rejected", () => {
      invalidateRound();
      invalidateMyBets();
      invalidateWallet();
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.removeAllListeners();
      socket.disconnect();
      setStatus("idle");
    };
  }, [enabled, queryClient]);

  return {
    realtimeConnected: status === "connected",
    realtimeReconnecting: status === "disconnected",
  };
}
