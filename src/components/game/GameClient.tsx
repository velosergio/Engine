"use client";

import * as Phaser from "phaser";
import { useEffect, useRef } from "react";
import type { GameBalancePayload } from "@/lib/game-balance-types";
import type { MatchEndPayload } from "@/lib/match-end-types";
import { mountPhaserGame } from "@/game/mountPhaserGame";

type Props = {
  balance: GameBalancePayload;
  onGameReady?: (game: Phaser.Game) => void;
  onMatchEnd?: (payload: MatchEndPayload) => void;
};

export function GameClient({ balance, onGameReady, onMatchEnd }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const balanceRef = useRef(balance);
  const onGameReadyRef = useRef(onGameReady);
  const onMatchEndRef = useRef(onMatchEnd);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    onGameReadyRef.current = onGameReady;
  }, [onGameReady]);

  useEffect(() => {
    onMatchEndRef.current = onMatchEnd;
  }, [onMatchEnd]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const game = mountPhaserGame(el, balanceRef.current);
    game.events.once("battle-ready", () => {
      onGameReadyRef.current?.(game);
    });
    const matchEndHandler = (...args: unknown[]) => {
      const payload = args.find(
        (a): a is MatchEndPayload =>
          !!a &&
          typeof a === "object" &&
          "outcome" in a &&
          ((a as MatchEndPayload).outcome === "victory" ||
            (a as MatchEndPayload).outcome === "defeat"),
      );
      if (payload) onMatchEndRef.current?.(payload);
    };
    game.events.on("match-end", matchEndHandler);
    const ro = new ResizeObserver(() => {
      game.scale.refresh();
    });
    ro.observe(el);
    return () => {
      game.events.off("match-end", matchEndHandler);
      ro.disconnect();
      game.destroy(true);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
