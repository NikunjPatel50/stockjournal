import type { EodhdSymbolSearchHit } from "@/lib/eodhd-symbol-search";

export type NseDirectorySymbol = {
  code: string;
  name: string;
};

function scoreNseMatch(symbol: NseDirectorySymbol, query: string): number {
  const code = symbol.code.toUpperCase();
  const name = symbol.name.toLowerCase();
  const q = query.trim().toUpperCase();
  const qLower = query.trim().toLowerCase();

  if (!q) return 0;
  if (code === q) return 100;
  if (code.startsWith(q)) return 80 - Math.min(code.length - q.length, 20);
  if (name.startsWith(qLower)) return 60;
  if (name.includes(qLower)) return 40;
  return 0;
}

export function parseNseEquityCsv(text: string): NseDirectorySymbol[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const symbols: NseDirectorySymbol[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const comma = line.indexOf(",");
    if (comma <= 0) continue;

    const code = line.slice(0, comma).trim().toUpperCase();
    const rest = line.slice(comma + 1);
    const nextComma = rest.indexOf(",");
    const name = (nextComma >= 0 ? rest.slice(0, nextComma) : rest)
      .trim()
      .replace(/^"|"$/g, "");

    if (!code || !name) continue;
    symbols.push({ code, name });
  }

  return symbols;
}

export function filterNseSymbolDirectory(
  symbols: NseDirectorySymbol[],
  query: string,
  limit = 20,
  exchange: "NSE" | "BSE" = "NSE"
): EodhdSymbolSearchHit[] {
  const trimmed = query.trim();

  const ranked = trimmed
    ? symbols
        .map((symbol) => ({ symbol, score: scoreNseMatch(symbol, trimmed) }))
        .filter(({ score }) => score > 0)
        .sort(
          (a, b) =>
            b.score - a.score || a.symbol.code.localeCompare(b.symbol.code)
        )
    : symbols
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((symbol) => ({ symbol, score: 0 }));

  return ranked.slice(0, limit).map(({ symbol }) => ({
    code: symbol.code,
    name: symbol.name,
    exchange,
    type: "Equity",
    currency: "INR",
  }));
}
