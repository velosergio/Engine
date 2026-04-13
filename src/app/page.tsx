import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Engine RTS</h1>
      <Link
        href="/game"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
      >
        Jugar
      </Link>
    </main>
  );
}
