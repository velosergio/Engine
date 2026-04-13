export type UnitBalance = {
  slug: string;
  maxHp: number;
  attack: number;
  speed: number;
  /** Golpes por segundo (desde BD). */
  attacksPerSecond: number;
  team: "ally" | "enemy" | "neutral";
};

export type GameBalancePayload = {
  units: Record<string, UnitBalance>;
  spawnIntervalMs: number;
  meleeRangePx: number;
  /** Distancia mínima entre bordes de las cajas para poder golpear (px). */
  meleeEdgeGapMaxPx: number;
  /** Respaldo si una unidad no define APS en BD. */
  attackCooldownMs: number;
  combatTickMs: number;
  mapWidth: number;
  mapHeight: number;
  baseWidth: number;
  baseHeight: number;
  aiSeparationRadiusPx: number;
  aiSeparationWeight: number;
};

/** Intervalo entre golpes en ms; sin APS válido → fallback. */
export function attackIntervalFromAps(
  attacksPerSecond: number,
  fallbackMs: number,
): number {
  if (!Number.isFinite(attacksPerSecond) || attacksPerSecond <= 0) {
    return fallbackMs;
  }
  return 1000 / attacksPerSecond;
}
