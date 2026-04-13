import { describe, expect, it } from "vitest";
import { attackIntervalFromAps } from "@/lib/game-balance-types";

describe("attackIntervalFromAps", () => {
  it("usa fallback con APS no finito, cero o negativo", () => {
    expect(attackIntervalFromAps(0, 500)).toBe(500);
    expect(attackIntervalFromAps(-1, 500)).toBe(500);
    expect(attackIntervalFromAps(Number.NaN, 500)).toBe(500);
    expect(attackIntervalFromAps(Number.POSITIVE_INFINITY, 500)).toBe(500);
  });

  it("devuelve 1000 / APS cuando APS es válido", () => {
    expect(attackIntervalFromAps(2, 999)).toBe(500);
    expect(attackIntervalFromAps(1, 999)).toBe(1000);
    expect(attackIntervalFromAps(4, 999)).toBe(250);
  });
});
