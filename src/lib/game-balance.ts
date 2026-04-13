import { prisma } from "@/lib/prisma";
import type { GameBalancePayload, UnitBalance } from "@/lib/game-balance-types";

export type { GameBalancePayload, UnitBalance } from "@/lib/game-balance-types";
export { attackIntervalFromAps } from "@/lib/game-balance-types";

function ruleNum(rules: Map<string, string>, key: string, fallback: number) {
  const v = rules.get(key);
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getGameBalance(): Promise<GameBalancePayload> {
  const [defs, ruleRows] = await Promise.all([
    prisma.unitDefinition.findMany(),
    prisma.gameRule.findMany(),
  ]);

  const rules = new Map(ruleRows.map((r) => [r.key, r.value]));

  const units: Record<string, UnitBalance> = {};
  for (const u of defs) {
    units[u.slug] = {
      slug: u.slug,
      maxHp: u.maxHp,
      attack: u.attack,
      speed: u.speed,
      attacksPerSecond: u.attacksPerSecond,
      team: u.team,
    };
  }

  const fallbackCd = ruleNum(rules, "attack_cooldown_ms", 1000);

  return {
    units,
    spawnIntervalMs: ruleNum(rules, "spawn_interval_ms", 5000),
    meleeRangePx: ruleNum(rules, "melee_range_px", 28),
    meleeEdgeGapMaxPx: ruleNum(rules, "melee_edge_gap_max_px", 16),
    attackCooldownMs: fallbackCd,
    combatTickMs: ruleNum(rules, "combat_tick_ms", 200),
    mapWidth: ruleNum(rules, "map_width", 960),
    mapHeight: ruleNum(rules, "map_height", 540),
    baseWidth: ruleNum(rules, "base_width", 200),
    baseHeight: ruleNum(rules, "base_height", 48),
    aiSeparationRadiusPx: ruleNum(rules, "ai_separation_radius_px", 48),
    aiSeparationWeight: ruleNum(rules, "ai_separation_weight", 3.2),
  };
}
