import type * as Phaser from "phaser";
import { BATTLE_PALETTE } from "@/game/pixel/palette";
import {
  SPRITE_ALLY,
  SPRITE_BASE,
  SPRITE_ENEMY,
  SPRITE_GROUND_TILE,
} from "@/game/pixel/sprites";

export const TEX_ALLY = "battle_ally";
export const TEX_ENEMY = "battle_enemy";
export const TEX_BASE = "battle_base";
export const TEX_GROUND = "battle_ground";

function hexCss(n: number): string {
  return `#${(n & 0xffffff).toString(16).padStart(6, "0")}`;
}

export function ensurePixelTexture(
  scene: Phaser.Scene,
  key: string,
  grid: number[][],
  palette: readonly number[],
  cellSize: number,
): void {
  if (scene.textures.exists(key)) return;

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const w = cols * cellSize;
  const h = rows * cellSize;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < rows; y++) {
    const row = grid[y] ?? [];
    for (let x = 0; x < cols; x++) {
      const idx = row[x] ?? 0;
      if (idx <= 0) continue;
      const raw = palette[idx];
      if (raw === undefined || raw === 0) continue;
      ctx.fillStyle = hexCss(raw);
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  scene.textures.addCanvas(key, canvas);
}

/** Registra texturas de batalla si aún no existen (idempotente). */
export function registerBattleTextures(scene: Phaser.Scene): void {
  ensurePixelTexture(scene, TEX_ALLY, SPRITE_ALLY, BATTLE_PALETTE, 1);
  ensurePixelTexture(scene, TEX_ENEMY, SPRITE_ENEMY, BATTLE_PALETTE, 1);
  ensurePixelTexture(scene, TEX_BASE, SPRITE_BASE, BATTLE_PALETTE, 1);
  ensurePixelTexture(scene, TEX_GROUND, SPRITE_GROUND_TILE, BATTLE_PALETTE, 1);
}
