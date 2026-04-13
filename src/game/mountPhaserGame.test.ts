import { beforeEach, describe, expect, it, vi } from "vitest";

const { registrySet, GameCtor } = vi.hoisted(() => {
  const reg = vi.fn();
  const Ctor = vi.fn(function GameMock(this: {
    registry: { set: typeof reg };
  }) {
    this.registry = { set: reg };
  });
  return { registrySet: reg, GameCtor: Ctor };
});

vi.mock("phaser", () => ({
  AUTO: 0,
  Game: GameCtor,
  Scale: { ENVELOP: 1, CENTER_BOTH: 2 },
}));

vi.mock("@/game/scenes/BattleScene", () => ({
  BattleScene: class BattleScene {},
}));

import type { GameBalancePayload } from "@/lib/game-balance-types";
import { mountPhaserGame } from "@/game/mountPhaserGame";

describe("mountPhaserGame", () => {
  beforeEach(() => {
    GameCtor.mockClear();
    registrySet.mockClear();
  });

  it("crea Phaser.Game con escena BattleScene y registra balance", () => {
    const balance: GameBalancePayload = {
      units: {},
      spawnIntervalMs: 5000,
      meleeRangePx: 56,
      meleeEdgeGapMaxPx: 32,
      attackCooldownMs: 1000,
      combatTickMs: 200,
      mapWidth: 640,
      mapHeight: 480,
      baseWidth: 400,
      baseHeight: 96,
      aiSeparationRadiusPx: 96,
      aiSeparationWeight: 3.2,
      playerCount: 2,
      attackSpeedUpgradeInitialCost: 14,
      attackSpeedUpgradePriceMult: 1.3,
      attackSpeedApsPerPurchase: 0.15,
    };
    const parent = document.createElement("div");
    mountPhaserGame(parent, balance);

    expect(GameCtor).toHaveBeenCalledTimes(1);
    const firstCall = GameCtor.mock.calls[0] as unknown as
      | [{ width: number; height: number; scene: unknown[] }]
      | undefined;
    expect(firstCall).toBeDefined();
    const cfg = firstCall![0];
    expect(cfg.width).toBe(640);
    expect(cfg.height).toBe(480);
    expect(Array.isArray(cfg.scene)).toBe(true);
    expect(cfg.scene).toHaveLength(1);

    expect(registrySet).toHaveBeenCalledWith("balance", balance);
  });
});
