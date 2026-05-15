import { useEffect, useState } from "react";

import type { CurrentRoundResponse } from "../api/gameTypes";
import {
  formatBasisPointsAsMultiplier,
  getLiveMultiplierBasisPoints,
} from "../game/liveMultiplier";

export function useLiveMultiplierLabel(
  round: CurrentRoundResponse | undefined,
): string {
  const [label, setLabel] = useState("1.00x");

  useEffect(() => {
    if (!round) {
      setLabel("1.00x");
      return;
    }

    if (round.status === "crashed") {
      setLabel(formatMultiplierFromCrashString(round.crashPointBasisPoints));
      return;
    }

    if (round.status === "betting") {
      setLabel("1.00x");
      return;
    }

    if (round.status !== "running") {
      setLabel("1.00x");
      return;
    }

    let frame = 0;

    const tick = () => {
      const basisPoints = getLiveMultiplierBasisPoints(
        round.startedAt,
        round.crashPointBasisPoints,
        Date.now(),
      );
      setLabel(formatBasisPointsAsMultiplier(basisPoints));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [
    round?.crashPointBasisPoints,
    round?.id,
    round?.startedAt,
    round?.status,
  ]);

  return label;
}

function formatMultiplierFromCrashString(crashBasisPoints: string): string {
  try {
    const basisPoints = BigInt(crashBasisPoints);

    return formatBasisPointsAsMultiplier(basisPoints);
  } catch {
    return "—";
  }
}
