import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AI_INITIAL_GOLD_PER_SEC,
  DAMAGE_UPGRADE_PRICE_MULT,
  INITIAL_DAMAGE_UPGRADE_COST,
  INITIAL_INCOME_UPGRADE_COST,
} from "@/lib/damage-upgrade-economy";
import { AiDirector, type BattleAiApi } from "@/game/ai/AiDirector";
import type { Mock } from "vitest";

type ApplyDamage = BattleAiApi["applyDamageUpgradeForPlayer"];
type ApplyAps = BattleAiApi["applyAttackSpeedUpgradeForPlayer"];

describe("AiDirector", () => {
  const balanceStub = {
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

  let director: AiDirector;
  let applyDamageUpgradeForPlayer: Mock<ApplyDamage>;
  let applyAttackSpeedUpgradeForPlayer: Mock<ApplyAps>;

  beforeEach(() => {
    director = new AiDirector();
    applyDamageUpgradeForPlayer = vi.fn<ApplyDamage>(() => true);
    applyAttackSpeedUpgradeForPlayer = vi.fn<ApplyAps>(() => true);
    director.setBattleApi({
      applyDamageUpgradeForPlayer,
      applyAttackSpeedUpgradeForPlayer,
    });
  });

  it("tras muchos ticks la IA (jugador 1) compra daño, nunca el jugador 0", () => {
    director.onMatchStart({ playerCount: 2, balance: balanceStub });
    for (let i = 0; i < 5000; i++) {
      director.onTick(i * 200, {
        time: i * 200,
        playerCount: 2,
        deltaMs: 200,
      });
    }
    expect(applyDamageUpgradeForPlayer).toHaveBeenCalled();
    expect(applyAttackSpeedUpgradeForPlayer).toHaveBeenCalled();
    const firstId = applyDamageUpgradeForPlayer.mock.calls[0][0];
    expect(firstId).toBe(1);
  });

  it("con coste bajo de APS la IA compra velocidad de ataque para el jugador 1", () => {
    const d = new AiDirector();
    const applyAps = vi.fn<ApplyAps>(() => true);
    const applyDmg = vi.fn<ApplyDamage>(() => true);
    d.setBattleApi({
      applyDamageUpgradeForPlayer: applyDmg,
      applyAttackSpeedUpgradeForPlayer: applyAps,
    });
    const bal = {
      ...balanceStub,
      attackSpeedUpgradeInitialCost: 1,
    };
    d.onMatchStart({ playerCount: 2, balance: bal });
    d.onTick(0, { time: 0, playerCount: 2, deltaMs: 12_000 });
    expect(applyAps).toHaveBeenCalledWith(1);
  });

  it("onTick sin setBattleApi no invoca la batalla", () => {
    const d = new AiDirector();
    d.onMatchStart({ playerCount: 2, balance: balanceStub });
    const api = vi.fn();
    d.onTick(0, { time: 0, playerCount: 2, deltaMs: 10_000 });
    expect(api).not.toHaveBeenCalled();
  });

  it("con playerCount 1 no procesa jugadores IA", () => {
    const d = new AiDirector();
    d.setBattleApi({
      applyDamageUpgradeForPlayer,
      applyAttackSpeedUpgradeForPlayer: vi.fn<ApplyAps>(() => true),
    });
    d.onMatchStart({ playerCount: 1, balance: { ...balanceStub, playerCount: 1 } });
    for (let i = 0; i < 500; i++) {
      d.onTick(i * 500, { time: i * 500, playerCount: 1, deltaMs: 500 });
    }
    expect(applyDamageUpgradeForPlayer).not.toHaveBeenCalled();
  });

  it("deltaMs <= 0 no acumula oro ni compras", () => {
    director.onMatchStart({ playerCount: 2, balance: balanceStub });
    applyDamageUpgradeForPlayer.mockClear();
    director.onTick(0, { time: 0, playerCount: 2, deltaMs: 0 });
    director.onTick(0, { time: 0, playerCount: 2, deltaMs: -100 });
    expect(applyDamageUpgradeForPlayer).not.toHaveBeenCalled();
  });

  it("tras comprar daño puede volver a comprar (sin competencia de APS)", () => {
    const bal = { ...balanceStub, attackSpeedUpgradeInitialCost: 9e15 };
    const d = new AiDirector();
    const apply = vi.fn<ApplyDamage>(() => true);
    d.setBattleApi({
      applyDamageUpgradeForPlayer: apply,
      applyAttackSpeedUpgradeForPlayer: vi.fn<ApplyAps>(() => true),
    });
    d.onMatchStart({ playerCount: 2, balance: bal });
    const cost0 = INITIAL_DAMAGE_UPGRADE_COST;
    const firstTickMs = Math.ceil(
      ((INITIAL_INCOME_UPGRADE_COST + cost0) / AI_INITIAL_GOLD_PER_SEC) * 1000,
    );
    d.onTick(0, { time: 0, playerCount: 2, deltaMs: firstTickMs });
    expect(apply).toHaveBeenCalledWith(1);
    const callsAfterFirst = apply.mock.calls.length;
    d.onTick(firstTickMs, {
      time: firstTickMs,
      playerCount: 2,
      deltaMs: 400_000,
    });
    expect(apply.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    expect(Math.ceil(cost0 * DAMAGE_UPGRADE_PRICE_MULT)).toBeGreaterThan(cost0);
  });

  it("tras mejora de ingreso acumula más oro y puede comprar daño", () => {
    const bal = { ...balanceStub, attackSpeedUpgradeInitialCost: 9e15 };
    const d = new AiDirector();
    const applyDmg = vi.fn<ApplyDamage>(() => true);
    d.setBattleApi({
      applyDamageUpgradeForPlayer: applyDmg,
      applyAttackSpeedUpgradeForPlayer: vi.fn<ApplyAps>(() => true),
    });
    d.onMatchStart({ playerCount: 2, balance: bal });
    const incomeCost = INITIAL_INCOME_UPGRADE_COST;
    const dtMs = Math.ceil((incomeCost / AI_INITIAL_GOLD_PER_SEC) * 1000);
    d.onTick(0, { time: 0, playerCount: 2, deltaMs: dtMs });
    applyDmg.mockClear();
    let t = dtMs;
    for (let i = 0; i < 3000; i++) {
      d.onTick(t, { time: t, playerCount: 2, deltaMs: 200 });
      t += 200;
    }
    expect(applyDmg.mock.calls.length).toBeGreaterThan(0);
  });
});
