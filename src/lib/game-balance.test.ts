import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyUnits, findManyRules } = vi.hoisted(() => ({
  findManyUnits: vi.fn(),
  findManyRules: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    unitDefinition: { findMany: findManyUnits },
    gameRule: { findMany: findManyRules },
  },
}));

import { getGameBalance } from "@/lib/game-balance";

describe("getGameBalance", () => {
  beforeEach(() => {
    findManyUnits.mockReset();
    findManyRules.mockReset();
  });

  it("mapea unidades por slug", async () => {
    findManyUnits.mockResolvedValue([
      {
        slug: "soldier_ally",
        maxHp: 10,
        attack: 2,
        speed: 90,
        attacksPerSecond: 1,
        team: "ally",
      },
    ]);
    findManyRules.mockResolvedValue([]);
    const b = await getGameBalance();
    expect(b.units.soldier_ally).toEqual({
      slug: "soldier_ally",
      maxHp: 10,
      attack: 2,
      speed: 90,
      attacksPerSecond: 1,
      team: "ally",
    });
  });

  it("usa fallback numérico si la regla no es un número finito", async () => {
    findManyUnits.mockResolvedValue([]);
    findManyRules.mockResolvedValue([
      { key: "melee_range_px", value: "56" },
      { key: "spawn_interval_ms", value: "foo" },
    ]);
    const b = await getGameBalance();
    expect(b.meleeRangePx).toBe(56);
    expect(b.spawnIntervalMs).toBe(5000);
  });

  it("acota player_count entre 2 y 8", async () => {
    findManyUnits.mockResolvedValue([]);
    findManyRules.mockResolvedValue([
      { key: "player_count", value: "1" },
    ]);
    expect((await getGameBalance()).playerCount).toBe(2);

    findManyRules.mockResolvedValue([
      { key: "player_count", value: "10" },
    ]);
    expect((await getGameBalance()).playerCount).toBe(8);

    findManyRules.mockResolvedValue([
      { key: "player_count", value: "3.7" },
    ]);
    expect((await getGameBalance()).playerCount).toBe(3);
  });

  it("lee reglas de mejora de velocidad de ataque", async () => {
    findManyUnits.mockResolvedValue([]);
    findManyRules.mockResolvedValue([
      { key: "attack_speed_upgrade_initial_cost", value: "20" },
      { key: "attack_speed_upgrade_price_mult", value: "1.5" },
      { key: "attack_speed_aps_per_purchase", value: "0.2" },
    ]);
    const b = await getGameBalance();
    expect(b.attackSpeedUpgradeInitialCost).toBe(20);
    expect(b.attackSpeedUpgradePriceMult).toBe(1.5);
    expect(b.attackSpeedApsPerPurchase).toBe(0.2);
  });

  it("usa fallbacks de velocidad de ataque si faltan reglas o no son numéricas", async () => {
    findManyUnits.mockResolvedValue([]);
    findManyRules.mockResolvedValue([
      { key: "attack_speed_upgrade_initial_cost", value: "nan" },
      { key: "attack_speed_upgrade_price_mult", value: "x" },
      { key: "attack_speed_aps_per_purchase", value: "not-a-number" },
    ]);
    const b = await getGameBalance();
    expect(b.attackSpeedUpgradeInitialCost).toBe(14);
    expect(b.attackSpeedUpgradePriceMult).toBe(1.3);
    expect(b.attackSpeedApsPerPurchase).toBe(0.15);
  });
});
