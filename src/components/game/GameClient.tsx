"use client";

import { useEffect, useRef } from "react";
import type { GameBalancePayload } from "@/lib/game-balance-types";
import { mountPhaserGame } from "@/game/mountPhaserGame";

type Props = {
  balance: GameBalancePayload;
};

export function GameClient({ balance }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const game = mountPhaserGame(el, balanceRef.current);
    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-3 p-4">
      <div
        ref={hostRef}
        className="overflow-hidden rounded-lg border border-white/10 shadow-lg"
        style={{
          width: balance.mapWidth,
          height: balance.mapHeight,
          maxWidth: "100%",
        }}
      />
    </div>
  );
}
