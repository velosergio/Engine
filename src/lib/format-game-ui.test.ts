import { describe, expect, it } from "vitest";
import { formatGold, formatIncomeRate } from "@/lib/format-game-ui";

describe("formatGold", () => {
  it("muestra entero simple por debajo de 1000", () => {
    expect(formatGold(0)).toBe("0");
    expect(formatGold(999)).toBe("999");
  });

  it("usa k con un decimal entre 1k y 10k", () => {
    expect(formatGold(1500)).toBe("1.5k");
  });

  it("usa k entero desde 10_000", () => {
    expect(formatGold(10_000)).toBe("10k");
    expect(formatGold(15_500)).toBe("15k");
  });

  it("usa M con un decimal desde 1_000_000", () => {
    expect(formatGold(1_200_000)).toBe("1.2M");
  });
});

describe("formatIncomeRate", () => {
  it("redondea a 2 decimales como número legible", () => {
    expect(formatIncomeRate(1.2)).toBe("1.2");
    expect(formatIncomeRate(1)).toBe("1");
    expect(formatIncomeRate(1.234)).toBe("1.23");
  });
});
