import "dotenv/config";
import { Team } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.unitDefinition.deleteMany();
  await prisma.gameRule.deleteMany();

  await prisma.unitDefinition.createMany({
    data: [
      {
        slug: "base",
        maxHp: 1000,
        attack: 0,
        speed: 0,
        attacksPerSecond: 0,
        team: Team.ally,
      },
      {
        slug: "soldier_ally",
        maxHp: 10,
        attack: 1,
        speed: 90,
        attacksPerSecond: 1.25,
        team: Team.ally,
      },
    ],
  });

  const rules: { key: string; value: string }[] = [
    { key: "spawn_interval_ms", value: "5000" },
    { key: "melee_range_px", value: "56" },
    { key: "melee_edge_gap_max_px", value: "32" },
    { key: "attack_cooldown_ms", value: "1000" },
    { key: "combat_tick_ms", value: "200" },
    { key: "map_width", value: "1920" },
    { key: "map_height", value: "1080" },
    { key: "base_width", value: "400" },
    { key: "base_height", value: "96" },
    { key: "ai_separation_radius_px", value: "96" },
    { key: "ai_separation_weight", value: "3.2" },
    { key: "player_count", value: "2" },
    { key: "attack_speed_upgrade_initial_cost", value: "14" },
    { key: "attack_speed_upgrade_price_mult", value: "1.3" },
    { key: "attack_speed_aps_per_purchase", value: "0.15" },
  ];

  for (const r of rules) {
    await prisma.gameRule.create({ data: r });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
