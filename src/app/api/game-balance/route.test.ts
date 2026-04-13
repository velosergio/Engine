import { describe, expect, it, vi } from "vitest";

const { getGameBalance } = vi.hoisted(() => ({
  getGameBalance: vi.fn(),
}));

vi.mock("@/lib/game-balance", () => ({
  getGameBalance,
}));

import { GET } from "@/app/api/game-balance/route";

describe("GET /api/game-balance", () => {
  it("devuelve 200 y JSON cuando getGameBalance resuelve", async () => {
    const payload = {
      units: {},
      spawnIntervalMs: 5000,
      meleeRangePx: 56,
      meleeEdgeGapMaxPx: 32,
      attackCooldownMs: 1000,
      combatTickMs: 200,
      mapWidth: 1920,
      mapHeight: 1080,
      baseWidth: 400,
      baseHeight: 96,
      aiSeparationRadiusPx: 96,
      aiSeparationWeight: 3.2,
      playerCount: 2,
      attackSpeedUpgradeInitialCost: 14,
      attackSpeedUpgradePriceMult: 1.3,
      attackSpeedApsPerPurchase: 0.15,
    };
    getGameBalance.mockResolvedValue(payload);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
  });

  it("devuelve 503 si la base de datos falla", async () => {
    getGameBalance.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({
      error: "No se pudo leer el balance desde la base de datos.",
    });
  });
});
