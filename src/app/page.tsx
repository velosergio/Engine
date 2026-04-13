import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold">Battlefront Engine System</h1>
        <Link
          href="/game"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
        >
          Jugar
        </Link>
      </div>
      <footer className="border-t border-white/10 py-4 text-center text-sm text-zinc-500">
        Sergio Veloza
      </footer>
    </main>
  );
}
