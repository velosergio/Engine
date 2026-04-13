import Link from "next/link";
import { GameClientGate } from "@/components/game/GameClientGate";
import { getGameBalance } from "@/lib/game-balance";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  let balance;
  try {
    balance = await getGameBalance();
  } catch {
    return (
      <main className="mx-auto max-w-lg p-8 text-center">
        <h1 className="mb-4 text-xl font-semibold">No se pudo cargar el juego</h1>
        <p className="mb-6 text-zinc-400">
          Comprueba que MariaDB esté en marcha, que exista la BD{" "}
          <code className="text-zinc-200">engine</code> y ejecuta{" "}
          <code className="text-zinc-200">npx prisma db push</code> y{" "}
          <code className="text-zinc-200">npx prisma db seed</code>.
        </p>
        <Link href="/" className="text-emerald-400 underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0c0f14]">
      <GameClientGate balance={balance} />
    </main>
  );
}
