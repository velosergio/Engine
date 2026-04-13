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
      {
        slug: "soldier_enemy",
        maxHp: 10,
        attack: 1,
        speed: 70,
        attacksPerSecond: 0.85,
        team: Team.enemy,
      },
    ],
  });

  const rules: { key: string; value: string }[] = [
    { key: "spawn_interval_ms", value: "5000" },
    { key: "melee_range_px", value: "28" },
    { key: "melee_edge_gap_max_px", value: "16" },
    { key: "attack_cooldown_ms", value: "1000" },
    { key: "combat_tick_ms", value: "200" },
    { key: "map_width", value: "960" },
    { key: "map_height", value: "540" },
    { key: "base_width", value: "200" },
    { key: "base_height", value: "48" },
    { key: "ai_separation_radius_px", value: "48" },
    { key: "ai_separation_weight", value: "3.2" },
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
