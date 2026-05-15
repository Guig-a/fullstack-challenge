import { useEffect, useState } from "react";

import type { CurrentRoundResponse } from "../api/gameTypes";
import { appConfig } from "../config/appConfig";

/** Segundos restantes na fase `betting` (aproximação: `createdAt` + janela configurável). */
export function useBettingCountdown(
  round: CurrentRoundResponse | undefined,
): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!round || round.status !== "betting") {
      setSecondsLeft(null);
      return;
    }

    const endsAt = Date.parse(round.createdAt) + appConfig.roundBettingWindowMs;

    const tick = () => {
      const msLeft = endsAt - Date.now();
      setSecondsLeft(msLeft > 0 ? Math.ceil(msLeft / 1000) : 0);
    };

    tick();
    const id = window.setInterval(tick, 250);

    return () => {
      window.clearInterval(id);
    };
  }, [round?.createdAt, round?.id, round?.status]);

  return secondsLeft;
}
