import type { RoundStatus } from "../../api/gameTypes";

const INITIAL_BP = 100n;

function maxCashoutBasisPoints(crashPointStr: string): bigint {
  const crashPointBasisPoints = BigInt(crashPointStr);

  return crashPointBasisPoints > INITIAL_BP
    ? crashPointBasisPoints - 1n
    : INITIAL_BP;
}

/** 0–100 para altura da curva durante `running`. */
export function crashCurveProgressPercent(
  status: RoundStatus,
  currentBasisPoints: bigint,
  crashPointBasisPointsStr: string,
): number {
  if (status === "betting") {
    return 5;
  }

  if (status === "crashed") {
    return 100;
  }

  const maxBp = maxCashoutBasisPoints(crashPointBasisPointsStr);
  const span = maxBp - INITIAL_BP;

  if (span <= 0n) {
    return 0;
  }

  const raw = Number(((currentBasisPoints - INITIAL_BP) * 100n) / span);

  return Math.max(2, Math.min(100, raw));
}

type CrashChartProps = {
  status: RoundStatus;
  crashPointBasisPointsStr: string;
  currentBasisPoints: bigint;
};

export function CrashChart({
  status,
  crashPointBasisPointsStr,
  currentBasisPoints,
}: CrashChartProps) {
  const progress = crashCurveProgressPercent(
    status,
    currentBasisPoints,
    crashPointBasisPointsStr,
  );

  const curveClass =
    status === "crashed"
      ? "from-red-500 via-orange-400 to-yellow-200 shadow-red-500/40"
      : "from-emerald-400 via-cyan-300 to-transparent shadow-emerald-500/30";

  return (
    <div className="relative mt-10 h-56 overflow-hidden rounded-3xl border border-emerald-300/20 bg-slate-900/90">
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-500/10 to-transparent transition-[height] duration-150 ease-out"
        style={{ height: `${progress}%` }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="curveGrad" x1="0" x2="1" y1="1" y2="0">
            <stop
              offset="0%"
              stopColor={
                status === "crashed" ? "rgb(248, 113, 113)" : "rgb(52, 211, 153)"
              }
              stopOpacity="0.95"
            />
            <stop
              offset="100%"
              stopColor="rgb(34, 211, 238)"
              stopOpacity="0.25"
            />
          </linearGradient>
        </defs>
        <path
          d={`M 0 100 Q 35 ${100 - progress * 0.85} 100 ${100 - progress}`}
          fill="none"
          stroke="url(#curveGrad)"
          strokeLinecap="round"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
          className="transition-[d] duration-150 ease-out"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex h-3 items-end">
        <div
          className={`w-full rounded-full bg-gradient-to-r ${curveClass} shadow-lg transition-all duration-150`}
          style={{ height: `${Math.max(12, progress * 0.35)}%` }}
        />
      </div>
    </div>
  );
}
