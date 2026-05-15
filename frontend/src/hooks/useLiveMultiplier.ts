import { useEffect, useState } from "react";

import type { CurrentRoundResponse } from "../api/gameTypes";
import {
  formatBasisPointsAsMultiplier,
  getLiveMultiplierBasisPoints,
} from "../game/liveMultiplier";

export type LiveMultiplierState = {
  label: string;
  basisPoints: bigint;
};

const INITIAL_BP = 100n;

export function useLiveMultiplierState(
  round: CurrentRoundResponse | undefined,
): LiveMultiplierState {
  const [state, setState] = useState<LiveMultiplierState>({
    label: "1.00x",
    basisPoints: INITIAL_BP,
  });

  useEffect(() => {
    if (!round) {
      setState({ label: "1.00x", basisPoints: INITIAL_BP });
      return;
    }

    if (round.status === "crashed") {
      try {
        const basisPoints = BigInt(round.crashPointBasisPoints);
        setState({
          label: formatBasisPointsAsMultiplier(basisPoints),
          basisPoints,
        });
      } catch {
        setState({ label: "—", basisPoints: INITIAL_BP });
      }
      return;
    }

    if (round.status === "betting" || round.status !== "running") {
      setState({ label: "1.00x", basisPoints: INITIAL_BP });
      return;
    }

    let frame = 0;

    const tick = () => {
      const basisPoints = getLiveMultiplierBasisPoints(
        round.startedAt,
        round.crashPointBasisPoints,
        Date.now(),
      );
      setState({
        label: formatBasisPointsAsMultiplier(basisPoints),
        basisPoints,
      });
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

  return state;
}

/** @deprecated Prefer `useLiveMultiplierState` quando precisar de basis points. */
export function useLiveMultiplierLabel(
  round: CurrentRoundResponse | undefined,
): string {
  return useLiveMultiplierState(round).label;
}
