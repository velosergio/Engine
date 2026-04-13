import * as Phaser from "phaser";
import type { GameBalancePayload } from "@/lib/game-balance-types";
import { BattleScene } from "@/game/scenes/BattleScene";

export function mountPhaserGame(
  parent: HTMLElement,
  balance: GameBalancePayload,
): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: balance.mapWidth,
    height: balance.mapHeight,
    backgroundColor: "#151a24",
    scene: [BattleScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);
  game.registry.set("balance", balance);
  return game;
}
