import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_DAMAGE_UPGRADE_COST } from "@/lib/damage-upgrade-economy";
import type { GameBalancePayload } from "@/lib/game-balance-types";
import { GameInfoSidebar } from "@/components/game/GameInfoSidebar";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/game/scenes/BattleScene", () => ({
  BattleScene: class BattleScene {},
}));

function incomeUpgradeCard(): HTMLElement {
  const el = document.querySelector(
    "#game-info-panel [class*='border-emerald-500/20']",
  );
  if (!el) throw new Error("tarjeta de ingreso no encontrada");
  return el as HTMLElement;
}

function damageUpgradeCard(): HTMLElement {
  const el = document.querySelector(
    "#game-info-panel [class*='border-rose-500/25']",
  );
  if (!el) throw new Error("tarjeta de daño no encontrada");
  return el as HTMLElement;
}

function attackSpeedUpgradeCard(): HTMLElement {
  const el = document.querySelector(
    "#game-info-panel [class*='border-sky-500/25']",
  );
  if (!el) throw new Error("tarjeta de velocidad de ataque no encontrada");
  return el as HTMLElement;
}

function advanceGameMs(ms: number) {
  const step = 500;
  for (let t = 0; t < ms; t += step) {
    act(() => {
      vi.advanceTimersByTime(Math.min(step, ms - t));
    });
  }
}

describe("GameInfoSidebar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("deshabilita mejorar daño si no hay juego o escena activa", () => {
    render(<GameInfoSidebar getGame={() => null} />);
    const dmg = within(damageUpgradeCard()).getByRole("button");
    expect(dmg).toBeDisabled();
    const aps = within(attackSpeedUpgradeCard()).getByRole("button");
    expect(aps).toBeDisabled();
  });

  it("compra mejora de ingreso con oro suficiente", () => {
    render(<GameInfoSidebar />);
    advanceGameMs(10_000);
    const incBtn = within(incomeUpgradeCard()).getByRole("button");
    expect(incBtn).toBeEnabled();
    fireEvent.click(incBtn);
    const aside = screen.getAllByLabelText("Barra de información")[0];
    expect(aside.textContent).toMatch(/\+1\.2\/s pasivo/);
  });

  it("compra mejora de daño cuando la escena acepta la compra", () => {
    const applyDamageUpgradeForPlayer = vi.fn(() => true);
    const mockScene = {
      scene: { isActive: () => true },
      applyDamageUpgradeForPlayer,
      applyAttackSpeedUpgradeForPlayer: vi.fn(),
    };
    const mockGame = {
      scene: {
        getScene: (key: string) => (key === "BattleScene" ? mockScene : null),
      },
    };
    render(<GameInfoSidebar getGame={() => mockGame as never} />);
    const needMs = INITIAL_DAMAGE_UPGRADE_COST * 1000;
    advanceGameMs(needMs);
    const dmgBtn = within(damageUpgradeCard()).getByRole("button");
    expect(dmgBtn).toBeEnabled();
    fireEvent.click(dmgBtn);
    expect(applyDamageUpgradeForPlayer).toHaveBeenCalledWith(0);
    const aside = screen.getAllByLabelText("Barra de información")[0];
    expect(aside.textContent).toMatch(/Bonus total:/);
    expect(aside.textContent).toMatch(/\+1/);
  });

  it("deshabilita velocidad de ataque con oro insuficiente aunque haya escena", () => {
    const mockScene = {
      scene: { isActive: () => true },
      applyDamageUpgradeForPlayer: vi.fn(),
      applyAttackSpeedUpgradeForPlayer: vi.fn(),
    };
    const mockGame = {
      scene: {
        getScene: (key: string) => (key === "BattleScene" ? mockScene : null),
      },
    };
    render(<GameInfoSidebar getGame={() => mockGame as never} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const apsBtn = within(attackSpeedUpgradeCard()).getByRole("button");
    expect(apsBtn).toBeDisabled();
    expect(mockScene.applyAttackSpeedUpgradeForPlayer).not.toHaveBeenCalled();
  });

  it("compra mejora de velocidad de ataque cuando la escena acepta la compra", () => {
    const applyAttackSpeedUpgradeForPlayer = vi.fn(() => true);
    const mockScene = {
      scene: { isActive: () => true },
      applyDamageUpgradeForPlayer: vi.fn(),
      applyAttackSpeedUpgradeForPlayer,
    };
    const mockGame = {
      scene: {
        getScene: (key: string) => (key === "BattleScene" ? mockScene : null),
      },
    };
    render(
      <GameInfoSidebar
        getGame={() => mockGame as never}
        balance={
          {
            attackSpeedUpgradeInitialCost: 14,
            attackSpeedUpgradePriceMult: 1.3,
            attackSpeedApsPerPurchase: 0.15,
          } as GameBalancePayload
        }
      />,
    );
    advanceGameMs(14_000);
    const apsBtn = within(attackSpeedUpgradeCard()).getByRole("button");
    expect(apsBtn).toBeEnabled();
    fireEvent.click(apsBtn);
    expect(applyAttackSpeedUpgradeForPlayer).toHaveBeenCalledWith(0);
    const aside = screen.getAllByLabelText("Barra de información")[0];
    expect(aside.textContent).toMatch(/Bonus total:/);
    expect(aside.textContent).toMatch(/0\.15/);
  });
});
