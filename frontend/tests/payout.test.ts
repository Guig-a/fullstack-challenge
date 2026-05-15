import { describe, expect, it } from "bun:test";

import { payoutCentsForCashout } from "../src/game/payout";

describe("payoutCentsForCashout", () => {
  it("calcula payout inteiro em centavos", () => {
    expect(payoutCentsForCashout("1000", 250n)).toBe(2500n);
    expect(payoutCentsForCashout("100", 199n)).toBe(199n);
  });
});
