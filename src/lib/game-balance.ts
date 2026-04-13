import { prisma } from "@/lib/prisma";
import type { GameBalancePayload, UnitBalance } from "@/lib/game-balance-types";

export type { GameBalancePayload, UnitBalance } from "@/lib/game-balance-types";
export { attackIntervalFromAps } from "@/lib/game-balance-types";

const REQUIRED_UNIT_SLUGS = ["base", "soldier_ally"] as const;

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

  const missing = REQUIRED_UNIT_SLUGS.filter((slug) => !units[slug]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan unidades requeridas en DB: ${missing.join(", ")}. Ejecuta prisma db seed.`,
    );
  }

  const fallbackCd = ruleNum(rules, "attack_cooldown_ms", 1000);
  const rawPlayers = ruleNum(rules, "player_count", 2);
  const playerCount = Math.max(2, Math.min(8, Math.floor(rawPlayers)));

  return {
    units,
    spawnIntervalMs: ruleNum(rules, "spawn_interval_ms", 5000),
    meleeRangePx: ruleNum(rules, "melee_range_px", 56),
    meleeEdgeGapMaxPx: ruleNum(rules, "melee_edge_gap_max_px", 32),
    attackCooldownMs: fallbackCd,
    combatTickMs: ruleNum(rules, "combat_tick_ms", 200),
    mapWidth: ruleNum(rules, "map_width", 1920),
    mapHeight: ruleNum(rules, "map_height", 1080),
    baseWidth: ruleNum(rules, "base_width", 400),
    baseHeight: ruleNum(rules, "base_height", 96),
    aiSeparationRadiusPx: ruleNum(rules, "ai_separation_radius_px", 96),
    aiSeparationWeight: ruleNum(rules, "ai_separation_weight", 3.2),
    playerCount,
    attackSpeedUpgradeInitialCost: ruleNum(
      rules,
      "attack_speed_upgrade_initial_cost",
      14,
    ),
    attackSpeedUpgradePriceMult: ruleNum(
      rules,
      "attack_speed_upgrade_price_mult",
      1.3,
    ),
    attackSpeedApsPerPurchase: ruleNum(
      rules,
      "attack_speed_aps_per_purchase",
      0.15,
    ),
  };
}
