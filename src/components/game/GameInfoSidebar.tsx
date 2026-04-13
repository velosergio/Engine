"use client";

import Link from "next/link";
import * as Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import { BattleScene } from "@/game/scenes/BattleScene";
import {
  DAMAGE_BONUS_PER_PURCHASE,
  DAMAGE_UPGRADE_PRICE_MULT,
  INITIAL_DAMAGE_UPGRADE_COST,
  INCOME_PER_UPGRADE_MULT,
  INCOME_UPGRADE_PRICE_MULT,
  INITIAL_INCOME_UPGRADE_COST,
} from "@/lib/damage-upgrade-economy";
import type { GameBalancePayload } from "@/lib/game-balance-types";
import { formatGold, formatIncomeRate } from "@/lib/format-game-ui";
import { DebugGameConsole } from "@/components/game/DebugGameConsole";

type EconomyState = {
  gold: number;
  incomePerSec: number;
  nextUpgradeCost: number;
  nextDamageUpgradeCost: number;
  nextAttackSpeedUpgradeCost: number;
};

function initialEconomy(balance?: GameBalancePayload): EconomyState {
  return {
    gold: 0,
    incomePerSec: 1,
    nextUpgradeCost: INITIAL_INCOME_UPGRADE_COST,
    nextDamageUpgradeCost: INITIAL_DAMAGE_UPGRADE_COST,
    nextAttackSpeedUpgradeCost: balance?.attackSpeedUpgradeInitialCost ?? 14,
  };
}

/** Puerta / salida, estilo simple acorde al HUD. */
function DoorExitIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="currentColor"
        fillOpacity={0.25}
        d="M4 4h12v16H4V4z"
      />
      <path
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        d="M4 4h12v16H4V4z"
      />
      <path
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        d="M16 5h4v14h-4M19 12h-2"
      />
      <circle cx="10" cy="12" r={1.25} fill="currentColor" />
    </svg>
  );
}

function GoldCoinSprite({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#b8860b" />
      <rect x="2" y="2" width="12" height="12" rx="1" fill="#f4c430" />
      <rect x="4" y="4" width="8" height="8" rx="1" fill="#fde047" />
      <rect x="6" y="6" width="4" height="4" fill="#ca8a04" />
    </svg>
  );
}

type SidebarProps = {
  getGame?: () => Phaser.Game | null;
  balance?: GameBalancePayload;
};

export function GameInfoSidebar({ getGame, balance }: SidebarProps) {
  const [eco, setEco] = useState(() => initialEconomy(balance));
  const ecoRef = useRef(eco);
  const [humanDamageBonus, setHumanDamageBonus] = useState(0);
  const [humanAttackSpeedApsBonus, setHumanAttackSpeedApsBonus] = useState(0);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    ecoRef.current = eco;
  }, [eco]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setEco((e) => ({ ...e, gold: e.gold + e.incomePerSec }));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const buyIncomeUpgrade = () => {
    setEco((e) => {
      if (Math.floor(e.gold) < e.nextUpgradeCost) return e;
      return {
        ...e,
        gold: e.gold - e.nextUpgradeCost,
        incomePerSec: e.incomePerSec * INCOME_PER_UPGRADE_MULT,
        nextUpgradeCost: Math.ceil(e.nextUpgradeCost * INCOME_UPGRADE_PRICE_MULT),
      };
    });
  };

  const getBattleScene = (): BattleScene | null => {
    const game = getGame?.();
    if (!game) return null;
    const scene = game.scene.getScene("BattleScene");
    if (!scene?.scene.isActive()) return null;
    return scene as BattleScene;
  };

  const buyDamageUpgrade = () => {
    const battle = getBattleScene();
    if (!battle) return;
    const e = ecoRef.current;
    if (Math.floor(e.gold) < e.nextDamageUpgradeCost) return;
    const cost = e.nextDamageUpgradeCost;
    if (!battle.applyDamageUpgradeForPlayer(0)) return;
    setHumanDamageBonus((b) => b + DAMAGE_BONUS_PER_PURCHASE);
    setEco({
      ...e,
      gold: e.gold - cost,
      nextDamageUpgradeCost: Math.ceil(cost * DAMAGE_UPGRADE_PRICE_MULT),
    });
  };

  const attackSpeedPriceMult = balance?.attackSpeedUpgradePriceMult ?? 1.3;
  const attackSpeedApsPerPurchase = balance?.attackSpeedApsPerPurchase ?? 0.15;

  const buyAttackSpeedUpgrade = () => {
    const battle = getBattleScene();
    if (!battle) return;
    const e = ecoRef.current;
    if (Math.floor(e.gold) < e.nextAttackSpeedUpgradeCost) return;
    const cost = e.nextAttackSpeedUpgradeCost;
    if (!battle.applyAttackSpeedUpgradeForPlayer(0)) return;
    setHumanAttackSpeedApsBonus((b) => b + attackSpeedApsPerPurchase);
    setEco({
      ...e,
      gold: e.gold - cost,
      nextAttackSpeedUpgradeCost: Math.ceil(cost * attackSpeedPriceMult),
    });
  };

  const debugAddGold = (amount: number) => {
    setEco((e) => ({ ...e, gold: e.gold + amount }));
  };

  const debugAddDamageBonus = (amount: number) => {
    setHumanDamageBonus((b) => b + amount);
  };

  const debugAddAttackSpeedApsBonus = (amount: number) => {
    setHumanAttackSpeedApsBonus((b) => b + amount);
  };

  const canAffordUpgrade = Math.floor(eco.gold) >= eco.nextUpgradeCost;
  const canAffordDamage =
    Math.floor(eco.gold) >= eco.nextDamageUpgradeCost && !!getBattleScene();
  const canAffordAttackSpeed =
    Math.floor(eco.gold) >= eco.nextAttackSpeedUpgradeCost &&
    !!getBattleScene();

  return (
    <>
    <aside
      className={`pointer-events-auto absolute left-0 top-0 z-30 flex h-full flex-col border-r border-white/10 bg-zinc-950/90 shadow-[4px_0_24px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[width] duration-200 ease-out ${
        expanded ? "w-[220px]" : "w-[52px]"
      }`}
      aria-label="Barra de información"
    >
      <div className="flex items-start gap-1 border-b border-white/10 p-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-zinc-200 transition hover:bg-white/10"
          aria-expanded={expanded}
          aria-controls={expanded ? "game-info-panel" : undefined}
          title={expanded ? "Contraer barra" : "Ampliar barra"}
        >
          <span className="text-lg leading-none" aria-hidden>
            {expanded ? "«" : "»"}
          </span>
        </button>
        {expanded ? (
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Información
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {expanded ? (
          <div
            id="game-info-panel"
            className="flex flex-1 flex-col gap-3 p-2 pt-3"
          >
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2.5">
              <GoldCoinSprite className="h-9 w-9 shrink-0 drop-shadow-sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-amber-200/70">
                  Oro (base)
                </p>
                <p
                  className="truncate font-mono text-xl font-semibold tabular-nums text-amber-100"
                  title={String(Math.floor(eco.gold))}
                >
                  {formatGold(eco.gold)}
                </p>
                <p className="text-[11px] text-emerald-400/90">
                  +{formatIncomeRate(eco.incomePerSec)}/s pasivo
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/80">
                Mejorar ingreso
              </p>
              <p className="text-[11px] leading-snug text-zinc-400">
                +20 % oro por segundo (multiplicativo). Siguiente precio:{" "}
                <span className="font-mono tabular-nums text-amber-200">
                  {formatGold(eco.nextUpgradeCost)}
                </span>
              </p>
              <button
                type="button"
                onClick={buyIncomeUpgrade}
                disabled={!canAffordUpgrade}
                className="rounded-md border border-emerald-500/40 bg-emerald-900/35 px-3 py-2 text-left text-xs font-medium text-emerald-100 transition enabled:hover:border-emerald-400/60 enabled:hover:bg-emerald-800/40 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="block">Mejorar ingreso</span>
                <span className="mt-0.5 block font-mono text-[10px] font-normal tabular-nums text-emerald-200/85">
                  {formatGold(eco.nextUpgradeCost)} oro
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-rose-500/25 bg-rose-950/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-200/85">
                Mejorar daño
              </p>
              <p className="text-[11px] leading-snug text-zinc-400">
                +{DAMAGE_BONUS_PER_PURCHASE} ataque a todas tus unidades (actuales y
                nuevas). Bonus total:{" "}
                <span className="font-mono tabular-nums text-rose-200">
                  +{humanDamageBonus}
                </span>
                . Siguiente precio:{" "}
                <span className="font-mono tabular-nums text-amber-200">
                  {formatGold(eco.nextDamageUpgradeCost)}
                </span>
              </p>
              <button
                type="button"
                onClick={buyDamageUpgrade}
                disabled={!canAffordDamage}
                className="rounded-md border border-rose-500/40 bg-rose-900/30 px-3 py-2 text-left text-xs font-medium text-rose-100 transition enabled:hover:border-rose-400/55 enabled:hover:bg-rose-800/35 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="block">Mejorar daño</span>
                <span className="mt-0.5 block font-mono text-[10px] font-normal tabular-nums text-rose-200/85">
                  {formatGold(eco.nextDamageUpgradeCost)} oro
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-sky-500/25 bg-sky-950/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-200/85">
                Mejorar velocidad de ataque
              </p>
              <p className="text-[11px] leading-snug text-zinc-400">
                +{formatIncomeRate(attackSpeedApsPerPurchase)} golpes/s a tus
                unidades (actuales y nuevas). Bonus total:{" "}
                <span className="font-mono tabular-nums text-sky-200">
                  +{formatIncomeRate(humanAttackSpeedApsBonus)}
                </span>
                . Siguiente precio:{" "}
                <span className="font-mono tabular-nums text-amber-200">
                  {formatGold(eco.nextAttackSpeedUpgradeCost)}
                </span>
              </p>
              <button
                type="button"
                onClick={buyAttackSpeedUpgrade}
                disabled={!canAffordAttackSpeed}
                className="rounded-md border border-sky-500/40 bg-sky-900/30 px-3 py-2 text-left text-xs font-medium text-sky-100 transition enabled:hover:border-sky-400/55 enabled:hover:bg-sky-800/35 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="block">Mejorar velocidad de ataque</span>
                <span className="mt-0.5 block font-mono text-[10px] font-normal tabular-nums text-sky-200/85">
                  {formatGold(eco.nextAttackSpeedUpgradeCost)} oro
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center gap-1 px-1 pb-2 pt-1">
            <GoldCoinSprite className="h-7 w-7 opacity-90" />
            <p
              className="w-full truncate text-center font-mono text-[10px] font-semibold tabular-nums text-amber-200/90"
              title={String(Math.floor(eco.gold))}
            >
              {formatGold(eco.gold)}
            </p>
            <p className="text-[9px] tabular-nums text-emerald-500/80">
              +{formatIncomeRate(eco.incomePerSec)}/s
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto shrink-0 border-t border-white/10 p-2">
        <Link
          href="/"
          className={`flex w-full min-h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 py-2 text-zinc-300 transition hover:border-rose-500/35 hover:bg-rose-950/35 hover:text-rose-100 ${
            expanded ? "px-3" : "px-1"
          }`}
          title="Salir del juego"
          aria-label="Salir del juego"
        >
          <DoorExitIcon className="h-6 w-6 shrink-0 text-zinc-200" />
          {expanded ? (
            <span className="text-xs font-medium tracking-wide">Salir</span>
          ) : null}
        </Link>
      </div>
    </aside>
    <DebugGameConsole
      getBattleScene={getBattleScene}
      onAddGold={debugAddGold}
      onAddDamageBonus={debugAddDamageBonus}
      onAddAttackSpeedApsBonus={debugAddAttackSpeedApsBonus}
    />
    </>
  );
}
