import type { GameBalancePayload } from "@/lib/game-balance-types";
import {
  AI_INITIAL_GOLD_PER_SEC,
  DAMAGE_UPGRADE_PRICE_MULT,
  INITIAL_DAMAGE_UPGRADE_COST,
  INCOME_PER_UPGRADE_MULT,
  INCOME_UPGRADE_PRICE_MULT,
  INITIAL_INCOME_UPGRADE_COST,
} from "@/lib/damage-upgrade-economy";

/** Comandos emitidos desde la base humana (extensible para mejoras futuras). */
export type HumanBaseCommand =
  | { type: "spawn_soldier"; slotIndex: number };

export type MatchSnapshot = {
  time: number;
  playerCount: number;
  deltaMs: number;
};

export type MatchStartContext = {
  playerCount: number;
  balance: GameBalancePayload;
};

export type BattleAiApi = {
  applyDamageUpgradeForPlayer: (playerId: number) => boolean;
  applyAttackSpeedUpgradeForPlayer: (playerId: number) => boolean;
};

/**
 * IA: oro virtual, mejora de ingreso, velocidad de ataque y daño en combate.
 * El humano usa oro en React; aquí solo jugadores 1..N-1.
 */
export class AiDirector {
  private battleApi: BattleAiApi | null = null;
  private virtualGold: number[] = [];
  private virtualIncomePerSec: number[] = [];
  private nextIncomeUpgradeCost: number[] = [];
  private nextAttackSpeedUpgradeCost: number[] = [];
  private nextDamageCost: number[] = [];
  private attackSpeedUpgradePriceMult = 1.3;

  setBattleApi(api: BattleAiApi): void {
    this.battleApi = api;
  }

  onMatchStart(context: MatchStartContext): void {
    const n = context.playerCount;
    const b = context.balance;
    this.virtualGold = new Array(n).fill(0);
    this.virtualIncomePerSec = new Array(n).fill(0);
    this.nextIncomeUpgradeCost = new Array(n).fill(0);
    this.nextAttackSpeedUpgradeCost = new Array(n).fill(0);
    this.nextDamageCost = new Array(n).fill(INITIAL_DAMAGE_UPGRADE_COST);
    this.attackSpeedUpgradePriceMult = b.attackSpeedUpgradePriceMult;
    for (let p = 1; p < n; p++) {
      this.virtualIncomePerSec[p] = AI_INITIAL_GOLD_PER_SEC;
      this.nextIncomeUpgradeCost[p] = INITIAL_INCOME_UPGRADE_COST;
      this.nextAttackSpeedUpgradeCost[p] = b.attackSpeedUpgradeInitialCost;
    }
  }

  onTick(_time: number, snapshot: MatchSnapshot): void {
    const api = this.battleApi;
    if (!api) return;

    const dtSec = snapshot.deltaMs / 1000;
    if (dtSec <= 0) return;

    for (let p = 1; p < snapshot.playerCount; p++) {
      this.virtualGold[p] += this.virtualIncomePerSec[p] * dtSec;

      while (this.virtualGold[p] >= this.nextIncomeUpgradeCost[p]) {
        this.virtualGold[p] -= this.nextIncomeUpgradeCost[p];
        this.nextIncomeUpgradeCost[p] = Math.ceil(
          this.nextIncomeUpgradeCost[p] * INCOME_UPGRADE_PRICE_MULT,
        );
        this.virtualIncomePerSec[p] *= INCOME_PER_UPGRADE_MULT;
      }

      while (this.virtualGold[p] >= this.nextAttackSpeedUpgradeCost[p]) {
        this.virtualGold[p] -= this.nextAttackSpeedUpgradeCost[p];
        this.nextAttackSpeedUpgradeCost[p] = Math.ceil(
          this.nextAttackSpeedUpgradeCost[p] * this.attackSpeedUpgradePriceMult,
        );
        api.applyAttackSpeedUpgradeForPlayer(p);
      }

      while (this.virtualGold[p] >= this.nextDamageCost[p]) {
        this.virtualGold[p] -= this.nextDamageCost[p];
        this.nextDamageCost[p] = Math.ceil(
          this.nextDamageCost[p] * DAMAGE_UPGRADE_PRICE_MULT,
        );
        api.applyDamageUpgradeForPlayer(p);
      }
    }
  }

  onHumanBaseCommand(cmd: HumanBaseCommand): void {
    void cmd;
  }
}
