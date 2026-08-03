import {
  eodhdExchangesForListingMarket,
  getListingMarket,
  normalizeEodhdSearchExchange,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import type { EodhdSymbolSearchHit } from "@/lib/eodhd-symbol-search";
import { normalizeEquityTicker, parseTickerInput } from "@/lib/ticker-normalize";

export type SymbolSearchResult = {
  code: string;
  name: string;
  exchange: string;
  badge: string;
};

type SymbolSearchRow = Omit<SymbolSearchResult, "badge">;

export function symbolSearchBadge(
  listingMarket: ListingMarketId,
  exchange: string
): string {
  if (listingMarket === "IN_NSE" || listingMarket === "IN_BSE") {
    return "in equity";
  }
  if (listingMarket === "US") {
    return "us equity";
  }
  if (listingMarket === "UK") {
    return "uk equity";
  }
  return `${exchange.toLowerCase()} equity`;
}

function attachBadges(
  results: SymbolSearchRow[],
  listingMarket: ListingMarketId
): SymbolSearchResult[] {
  return results.map((row) => ({
    ...row,
    badge: symbolSearchBadge(listingMarket, row.exchange),
  }));
}

function exchangeMatchesMarket(
  exchange: string,
  allowedExchanges: Set<string>
): boolean {
  const normalized = normalizeEodhdSearchExchange(exchange);
  return (
    allowedExchanges.has(exchange.toUpperCase()) ||
    allowedExchanges.has(normalized)
  );
}

function exchangeScore(
  exchange: string,
  allowedExchanges: Set<string>
): number {
  return exchangeMatchesMarket(exchange, allowedExchanges) ? 2 : 0;
}

function queryMatchScore(
  hit: EodhdSymbolSearchHit,
  query: string
): number {
  const normalized = normalizeEquityTicker(query);
  const lowerQuery = query.trim().toLowerCase();
  const code = hit.code.toUpperCase();
  const name = hit.name.toLowerCase();

  if (code === normalized) return 100;
  if (name === lowerQuery) return 90;
  if (code.startsWith(normalized) && normalized.length >= 1) return 70;
  if (name.startsWith(lowerQuery) && lowerQuery.length >= 2) return 60;
  if (name.includes(lowerQuery) && lowerQuery.length >= 2) return 40;
  return 10;
}

export function rankSymbolSearchResults(
  results: EodhdSymbolSearchHit[],
  listingMarket: ListingMarketId,
  query: string
): SymbolSearchRow[] {
  const allowed = new Set(
    eodhdExchangesForListingMarket(listingMarket).map((e) => e.toUpperCase())
  );

  return [...results]
    .filter((hit) => exchangeMatchesMarket(hit.exchange, allowed))
    .map((hit) => ({
      hit,
      score:
        exchangeScore(hit.exchange, allowed) * 50 +
        queryMatchScore(hit, query),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ hit }) => ({
      code: hit.code,
      name: hit.name,
      exchange: normalizeEodhdSearchExchange(hit.exchange),
    }));
}

export function finalizeSymbolSearchResults(
  results: SymbolSearchRow[],
  listingMarket: ListingMarketId,
  query: string
): SymbolSearchResult[] {
  const allowed = new Set(
    eodhdExchangesForListingMarket(listingMarket).map((e) => e.toUpperCase())
  );

  const marketRows = results.filter((row) =>
    exchangeMatchesMarket(row.exchange, allowed)
  );

  return attachBadges(
    marketRows
      .map((row) => ({
        row,
        score:
          100 +
          queryMatchScore(
            {
              code: row.code,
              name: row.name,
              exchange: row.exchange,
              type: "",
              currency: null,
            },
            query
          ),
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ row }) => row),
    listingMarket
  );
}

export function filterSymbolSearchResultsForMarket(
  results: SymbolSearchRow[],
  listingMarket: ListingMarketId
): SymbolSearchRow[] {
  const allowed = new Set(
    eodhdExchangesForListingMarket(listingMarket).map((e) => e.toUpperCase())
  );
  return results.filter((row) =>
    exchangeMatchesMarket(row.exchange, allowed)
  );
}

export function pickBestSymbolMatch(
  query: string,
  results: SymbolSearchResult[]
): SymbolSearchResult | null {
  const trimmed = query.trim();
  if (!trimmed || results.length === 0) return null;

  const normalized = parseTickerInput(trimmed);
  const lowerQuery = trimmed.toLowerCase();

  const exactCode = results.find((row) => row.code.toUpperCase() === normalized);
  if (exactCode) return exactCode;

  const exactName = results.find((row) => row.name.toLowerCase() === lowerQuery);
  if (exactName) return exactName;

  const codePrefixMatches = results.filter((row) =>
    row.code.toUpperCase().startsWith(normalized)
  );
  if (codePrefixMatches.length === 1 && normalized.length >= 2) {
    return codePrefixMatches[0];
  }

  const nameMatches = results.filter(
    (row) =>
      row.name.toLowerCase().startsWith(lowerQuery) ||
      row.name.toLowerCase().includes(lowerQuery)
  );
  if (nameMatches.length === 1) return nameMatches[0];

  if (results.length === 1 && normalized.length >= 2) {
    const only = results[0];
    if (
      only.code.toUpperCase().startsWith(normalized) ||
      only.name.toLowerCase().includes(lowerQuery)
    ) {
      return only;
    }
  }

  return null;
}

export function symbolNotFoundMessage(listingMarket: ListingMarketId): string {
  const label = getListingMarket(listingMarket).label;
  return `Symbol not found on ${label}. Pick a suggestion or enter a valid ticker.`;
}
