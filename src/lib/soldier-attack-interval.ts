import { attackIntervalFromAps } from "@/lib/game-balance-types";

/** Intervalo entre golpes (ms) del soldado con bonus de APS acumulativo por mejoras. */
export function soldierAttackIntervalMs(
  baseAttacksPerSecond: number,
  bonusAps: number,
  fallbackMs: number,
): number {
  return attackIntervalFromAps(baseAttacksPerSecond + bonusAps, fallbackMs);
}
