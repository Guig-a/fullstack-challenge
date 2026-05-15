import { describe, expect, it } from "bun:test";

import {
  formatBasisPointsAsMultiplier,
  getLiveMultiplierBasisPoints,
} from "../src/game/liveMultiplier";

describe("getLiveMultiplierBasisPoints", () => {
  it("retorna 1.00x (100bp) antes de iniciar a rodada", () => {
    const bp = getLiveMultiplierBasisPoints(null, "500", Date.now());
    expect(bp).toBe(100n);
  });

  it("sobe 10 basis points por segundo após startedAt", () => {
    const started = "2026-01-01T00:00:00.000Z";
    const t0 = Date.parse(started);
    const bp1s = getLiveMultiplierBasisPoints(started, "500", t0 + 1000);
    expect(bp1s).toBe(110n);
  });

  it("respeita teto de cashout (crashPoint - 1)", () => {
    const started = "2026-01-01T00:00:00.000Z";
    const t0 = Date.parse(started);
    const far = getLiveMultiplierBasisPoints(started, "200", t0 + 60_000);
    expect(far).toBe(199n);
  });
});

describe("formatBasisPointsAsMultiplier", () => {
  it("formata basis points como string x", () => {
    expect(formatBasisPointsAsMultiplier(199n)).toBe("1.99x");
    expect(formatBasisPointsAsMultiplier(100n)).toBe("1.00x");
  });
});
