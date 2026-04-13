"use client";

import Link from "next/link";
import type { MatchOutcome } from "@/lib/match-end-types";

type Props = {
  outcome: MatchOutcome;
};

export function MatchEndModal({ outcome }: Props) {
  const victory = outcome === "victory";

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-end-title"
      aria-describedby="match-end-desc"
    >
      <div
        className={`w-full max-w-md rounded-xl border px-6 py-8 shadow-[0_0_48px_rgba(0,0,0,0.5)] ${
          victory
            ? "border-emerald-500/35 bg-[#0c1210]/95"
            : "border-rose-500/35 bg-[#140c10]/95"
        }`}
      >
        <h2
          id="match-end-title"
          className={`text-center text-2xl font-bold tracking-tight ${
            victory ? "text-emerald-200" : "text-rose-200"
          }`}
        >
          {victory ? "Victoria" : "Derrota"}
        </h2>
        <p
          id="match-end-desc"
          className="mt-3 text-center text-sm leading-relaxed text-zinc-400"
        >
          {victory
            ? "Has destruido la base enemiga."
            : "Tu base ha sido destruida."}
        </p>
        <Link
          href="/"
          className={`mt-8 flex w-full items-center justify-center rounded-lg border px-4 py-3 text-sm font-semibold transition ${
            victory
              ? "border-emerald-500/45 bg-emerald-950/50 text-emerald-100 hover:border-emerald-400/60 hover:bg-emerald-900/45"
              : "border-rose-500/45 bg-rose-950/45 text-rose-100 hover:border-rose-400/55 hover:bg-rose-900/40"
          }`}
        >
          Volver al menú
        </Link>
      </div>
    </div>
  );
}
