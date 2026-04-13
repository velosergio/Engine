import { describe, expect, it } from "vitest";
import { soldierAttackIntervalMs } from "@/lib/soldier-attack-interval";

describe("soldierAttackIntervalMs", () => {
  it("subir bonus APS reduce el intervalo entre golpes", () => {
    const fallback = 1000;
    const base = 1;
    const t0 = soldierAttackIntervalMs(base, 0, fallback);
    const t1 = soldierAttackIntervalMs(base, 0.5, fallback);
    expect(t1).toBeLessThan(t0);
  });

  it("con APS efectivo <= 0 usa el fallback", () => {
    const fallback = 750;
    expect(soldierAttackIntervalMs(0.2, -0.2, fallback)).toBe(fallback);
    expect(soldierAttackIntervalMs(0, 0, fallback)).toBe(fallback);
  });
});
