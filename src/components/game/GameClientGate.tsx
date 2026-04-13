"use client";

import dynamic from "next/dynamic";
import type { GameBalancePayload } from "@/lib/game-balance-types";

const GameClient = dynamic(
  () =>
    import("@/components/game/GameClient").then((m) => ({
      default: m.GameClient,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="animate-pulse text-zinc-400">Cargando motor del juego…</p>
    ),
  },
);

export function GameClientGate({ balance }: { balance: GameBalancePayload }) {
  return <GameClient balance={balance} />;
}
