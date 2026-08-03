import { NextResponse } from "next/server";
import { searchEodhdSymbols } from "@/lib/eodhd-symbol-search";
import { normalizeListingMarket, type ListingMarketId } from "@/lib/equity-listing-markets";
import {
  filterNseSymbolDirectory,
  getNseSymbolDirectory,
} from "@/lib/nse-symbol-directory";
import {
  filterSymbolSearchResultsForMarket,
  finalizeSymbolSearchResults,
  rankSymbolSearchResults,
} from "@/lib/symbol-search";
import { getCurrentUser } from "@/lib/supabase/server";
import { searchYahooSymbols } from "@/lib/yahoo-symbol-search";
import type { EodhdSymbolSearchHit } from "@/lib/eodhd-symbol-search";

const RESULT_LIMIT = 20;
const REMOTE_TIMEOUT_MS = 4000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  }
}

function finalizeHits(
  hits: EodhdSymbolSearchHit[],
  listingMarket: ListingMarketId,
  query: string
) {
  const ranked = rankSymbolSearchResults(hits, listingMarket, query);
  const filtered = filterSymbolSearchResultsForMarket(ranked, listingMarket);
  return finalizeSymbolSearchResults(
    filtered.slice(0, RESULT_LIMIT),
    listingMarket,
    query
  );
}

async function searchRemoteSymbols(
  query: string,
  listingMarket: ListingMarketId
): Promise<EodhdSymbolSearchHit[]> {
  if (!query) return [];

  const apiKey = process.env.EODHD_API_KEY?.trim();
  let remote =
    (await withTimeout(
      searchYahooSymbols(query, listingMarket, RESULT_LIMIT),
      REMOTE_TIMEOUT_MS
    )) ?? [];

  if (remote.length === 0 && apiKey) {
    remote =
      (await withTimeout(
        searchEodhdSymbols(query, apiKey, {
          limit: RESULT_LIMIT,
          listingMarket,
        }),
        REMOTE_TIMEOUT_MS
      )) ?? [];
  }

  return remote;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const listingMarket = normalizeListingMarket(
    url.searchParams.get("listingMarket")
  );

  if (query.length > 64) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  let hits: EodhdSymbolSearchHit[] = [];

  if (listingMarket === "IN_NSE") {
    const directory = await getNseSymbolDirectory();
    hits = filterNseSymbolDirectory(directory, query, RESULT_LIMIT, "NSE");

    return NextResponse.json({
      results: finalizeHits(hits, listingMarket, query),
    });
  }

  if (listingMarket === "IN_BSE") {
    hits = await searchRemoteSymbols(query, listingMarket);

    return NextResponse.json({
      results: finalizeHits(hits, listingMarket, query),
    });
  }

  hits = await searchRemoteSymbols(query, listingMarket);

  return NextResponse.json({
    results: finalizeHits(hits, listingMarket, query),
  });
}
