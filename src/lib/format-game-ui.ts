export function formatGold(n: number): string {
  const v = Math.floor(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.floor(v / 1_000)}k`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

/** Hasta 2 decimales, sin ceros sobrantes. */
export function formatIncomeRate(n: number): string {
  const r = Math.round(n * 100) / 100;
  return String(r);
}
