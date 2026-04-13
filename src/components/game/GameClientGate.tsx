"use client";

import dynamic from "next/dynamic";
import * as Phaser from "phaser";
import { useCallback, useRef, useState } from "react";
import type { GameBalancePayload } from "@/lib/game-balance-types";
import type { MatchEndPayload, MatchOutcome } from "@/lib/match-end-types";
import { GameInfoSidebar } from "@/components/game/GameInfoSidebar";
import { MatchEndModal } from "@/components/game/MatchEndModal";

const GameClient = dynamic(
  () =>
    import("@/components/game/GameClient").then((m) => ({
      default: m.GameClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#151a24]">
        <p className="animate-pulse text-zinc-400">Cargando motor del juego…</p>
      </div>
    ),
  },
);

export function GameClientGate({ balance }: { balance: GameBalancePayload }) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [matchOutcome, setMatchOutcome] = useState<MatchOutcome | null>(null);

  const handleGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game;
  }, []);

  const handleMatchEnd = useCallback((payload: MatchEndPayload) => {
    setMatchOutcome(payload.outcome);
  }, []);

  const getGame = useCallback(() => gameRef.current, []);

  return (
    <div className="absolute inset-0">
      <GameClient
        balance={balance}
        onGameReady={handleGameReady}
        onMatchEnd={handleMatchEnd}
      />
      <GameInfoSidebar getGame={getGame} balance={balance} />
      {matchOutcome ? <MatchEndModal outcome={matchOutcome} /> : null}
    </div>
  );
}
