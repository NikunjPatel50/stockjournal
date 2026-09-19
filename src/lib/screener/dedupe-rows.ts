import { normalizeEquityTicker } from "@/lib/ticker-normalize";

export function dedupeRowsById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const row of rows) {
    const key = normalizeEquityTicker(row.id) || row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique;
}

export function dedupeRowsByTicker<T extends { ticker: string }>(
  rows: T[]
): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const row of rows) {
    const key = normalizeEquityTicker(row.ticker);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique;
}
