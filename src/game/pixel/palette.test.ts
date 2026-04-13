import { describe, expect, it } from "vitest";
import { BATTLE_PALETTE } from "@/game/pixel/palette";

describe("BATTLE_PALETTE", () => {
  it("reserva el índice 0 como transparente", () => {
    expect(BATTLE_PALETTE[0]).toBe(0x000000);
  });

  it("tiene entradas de color definidas", () => {
    expect(BATTLE_PALETTE.length).toBeGreaterThanOrEqual(8);
    for (let i = 1; i < BATTLE_PALETTE.length; i++) {
      expect(typeof BATTLE_PALETTE[i]).toBe("number");
    }
  });
});
