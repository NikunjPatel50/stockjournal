import {
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import { getClientNseSymbolDirectory } from "@/lib/nse-symbol-directory-client";
import { filterNseSymbolDirectory } from "@/lib/nse-symbol-directory-shared";
import {
  filterSymbolSearchResultsForMarket,
  finalizeSymbolSearchResults,
  pickBestSymbolMatch,
  rankSymbolSearchResults,
  type SymbolSearchResult,
} from "@/lib/symbol-search";
import {
  isTickerDisplayLabel,
  parseTickerInput,
} from "@/lib/ticker-normalize";

async function searchLocalNseSymbols(
  query: string,
  listingMarket: ListingMarketId
): Promise<SymbolSearchResult[]> {
  const directory = await getClientNseSymbolDirectory();
  const hits = filterNseSymbolDirectory(directory, query, 20, "NSE");
  const ranked = rankSymbolSearchResults(hits, listingMarket, query);
  const filtered = filterSymbolSearchResultsForMarket(ranked, listingMarket);
  return finalizeSymbolSearchResults(
    filtered.slice(0, 20),
    listingMarket,
    query
  );
}

function mergeNseSymbolResults(
  local: SymbolSearchResult[],
  remote: SymbolSearchResult[],
  listingMarket: ListingMarketId,
  query: string
): SymbolSearchResult[] {
  const hits = [...local, ...remote].map((row) => ({
    code: row.code,
    name: row.name,
    exchange: row.exchange || "NSE",
    type: "Equity",
    currency: "INR",
  }));
  const ranked = rankSymbolSearchResults(hits, listingMarket, query);
  const filtered = filterSymbolSearchResultsForMarket(ranked, listingMarket);
  return finalizeSymbolSearchResults(filtered, listingMarket, query).slice(
    0,
    20
  );
}

export async function searchEquitySymbols(
  query: string,
  listingMarket: ListingMarketId,
  signal?: AbortSignal
): Promise<SymbolSearchResult[]> {
  if (listingMarket !== "IN_NSE") {
    return fetchSymbolSuggestions(query, listingMarket, signal);
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const localPromise = searchLocalNseSymbols(query, listingMarket);
  const remotePromise = fetchSymbolSuggestions(
    query,
    listingMarket,
    signal
  ).catch((error: unknown) => {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return [] as SymbolSearchResult[];
  });
  const [local, remote] = await Promise.all([localPromise, remotePromise]);
  return mergeNseSymbolResults(local, remote, listingMarket, query);
}

async function fetchSymbolSuggestions(
  query: string,
  listingMarket: ListingMarketId,
  signal?: AbortSignal
): Promise<SymbolSearchResult[]> {
  const params = new URLSearchParams({ q: query, listingMarket });
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), 8000);

  const onAbort = () => timeoutController.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(`/api/symbol-search?${params.toString()}`, {
      signal: timeoutController.signal,
    });
    if (!res.ok) {
      throw new Error("search_failed");
    }
    const data = (await res.json()) as { results?: SymbolSearchResult[] };
    return data.results ?? [];
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function resolveEquitySymbolForMarket(
  rawQuery: string,
  listingMarket: ListingMarketId
): Promise<SymbolSearchResult | null> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return null;

  const searchText = isTickerDisplayLabel(trimmed)
    ? parseTickerInput(trimmed)
    : trimmed;
  if (!searchText) return null;

  if (listingMarket === "IN_NSE") {
    const local = await searchLocalNseSymbols(searchText, listingMarket).catch(
      () => [] as SymbolSearchResult[]
    );
    const normalized = parseTickerInput(searchText);
    const lowerQuery = searchText.toLowerCase();
    const exact = local.find(
      (row) =>
        row.code.toUpperCase() === normalized ||
        row.name.toLowerCase() === lowerQuery
    );
    if (exact) return exact;
  }

  const results = await searchEquitySymbols(searchText, listingMarket);
  return pickBestSymbolMatch(searchText, results);
}

/** Load the bundled NSE directory ahead of a lookup. */
export function prewarmEquitySymbolSearch(): void {
  void getClientNseSymbolDirectory().catch(() => undefined);
}
