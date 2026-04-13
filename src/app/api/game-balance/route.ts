import { NextResponse } from "next/server";
import { getGameBalance } from "@/lib/game-balance";

export async function GET() {
  try {
    const balance = await getGameBalance();
    return NextResponse.json(balance);
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el balance desde la base de datos." },
      { status: 503 },
    );
  }
}
