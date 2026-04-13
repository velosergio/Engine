"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BattleScene } from "@/game/scenes/BattleScene";

const DEBUG_LUMP = 1_000_000;

export function isDebugConsoleToggleKey(e: KeyboardEvent): boolean {
  if (e.key === "|") return true;
  if (e.code === "Backslash" && e.shiftKey) return true;
  return false;
}

type DebugGameConsoleProps = {
  getBattleScene: () => BattleScene | null;
  onAddGold: (amount: number) => void;
  onAddDamageBonus: (amount: number) => void;
  onAddAttackSpeedApsBonus: (amount: number) => void;
};

export function DebugGameConsole({
  getBattleScene,
  onAddGold,
  onAddDamageBonus,
  onAddAttackSpeedApsBonus,
}: DebugGameConsoleProps) {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("");
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setLastMsg(null);
        return;
      }

      const target = e.target as Node | null;
      const tag =
        target && "tagName" in target
          ? String((target as HTMLElement).tagName).toLowerCase()
          : "";
      const typingInField =
        tag === "input" ||
        tag === "textarea" ||
        (target as HTMLElement | null)?.isContentEditable;

      if (isDebugConsoleToggleKey(e) && (!typingInField || open)) {
        if (typingInField && target === inputRef.current) {
          return;
        }
        e.preventDefault();
        if (open) setLastMsg(null);
        setOpen(!open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const runCommand = useCallback(() => {
    const cmd = line.trim().toLowerCase();
    const battle = getBattleScene();

    if (cmd === "robinhood") {
      onAddGold(DEBUG_LUMP);
      setLastMsg("+ oro (debug)");
      setLine("");
      return;
    }

    if (cmd === "chucknorris") {
      if (!battle) {
        setLastMsg("Sin BattleScene activa.");
        return;
      }
      if (battle.debugAddFlatDamageBonusForPlayer(0, DEBUG_LUMP)) {
        onAddDamageBonus(DEBUG_LUMP);
        setLastMsg("+ ataque (debug)");
      } else {
        setLastMsg("No se pudo aplicar daño.");
      }
      setLine("");
      return;
    }

    if (cmd === "illidan") {
      if (!battle) {
        setLastMsg("Sin BattleScene activa.");
        return;
      }
      if (battle.debugAddFlatAttackSpeedApsForPlayer(0, DEBUG_LUMP)) {
        onAddAttackSpeedApsBonus(DEBUG_LUMP);
        setLastMsg("+ velocidad de ataque APS (debug)");
      } else {
        setLastMsg("No se pudo aplicar APS.");
      }
      setLine("");
      return;
    }

    if (cmd === "baaarbaro") {
      if (!battle) {
        setLastMsg("Sin BattleScene activa.");
        return;
      }
      if (battle.debugForceHumanVictory()) {
        setLastMsg("Victoria forzada (debug).");
      } else {
        setLastMsg("No se pudo forzar victoria.");
      }
      setLine("");
      return;
    }

    setLastMsg(`Comando desconocido: "${cmd}".`);
  }, [
    getBattleScene,
    line,
    onAddAttackSpeedApsBonus,
    onAddDamageBonus,
    onAddGold,
  ]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-4 left-1/2 z-[60] w-[min(100%,28rem)] -translate-x-1/2 px-3"
      role="dialog"
      aria-label="Consola de depuración"
    >
      <div className="rounded-lg border border-amber-500/40 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-md">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
          Consola debug — <kbd className="rounded bg-white/10 px-1">|</kbd>{" "}
          cierra · Esc
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runCommand();
              }
            }}
            placeholder="Escribe un comando"
            className="min-w-0 flex-1 rounded border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-sm text-zinc-100 outline-none ring-amber-500/30 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-1"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={runCommand}
            className="shrink-0 rounded border border-amber-500/45 bg-amber-950/50 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-900/50"
          >
            Ejecutar
          </button>
        </div>
        {lastMsg ? (
          <p className="mt-2 font-mono text-xs text-zinc-400">{lastMsg}</p>
        ) : null}
      </div>
    </div>
  );
}
