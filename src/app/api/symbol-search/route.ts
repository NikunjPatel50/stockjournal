import { NextResponse } from "next/server";
import { searchEodhdSymbols } from "@/lib/eodhd-symbol-search";
import { normalizeListingMarket, type ListingMarketId } from "@/lib/equity-listing-markets";
import {
  filterSymbolSearchResultsForMarket,
  finalizeSymbolSearchResults,
  rankSymbolSearchResults,
} from "@/lib/symbol-search";
import { getCurrentUser } from "@/lib/supabase/server";
import { searchYahooSymbols } from "@/lib/yahoo-symbol-search";

const YAHOO_PRIMARY_MARKETS = new Set<ListingMarketId>(["IN_NSE", "IN_BSE"]);

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

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  if (query.length > 64) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const apiKey = process.env.EODHD_API_KEY?.trim();
  let hits = YAHOO_PRIMARY_MARKETS.has(listingMarket)
    ? await searchYahooSymbols(query, listingMarket, 20)
    : [];

  if (hits.length === 0 && apiKey) {
    hits = await searchEodhdSymbols(query, apiKey, {
      limit: 20,
      listingMarket,
    });
    if (hits.length === 0) {
      hits = await searchEodhdSymbols(query, apiKey, { limit: 20 });
    }
  }

  if (hits.length === 0) {
    hits = await searchYahooSymbols(query, listingMarket, 20);
  }

  const ranked = rankSymbolSearchResults(hits, listingMarket, query);
  const filtered = filterSymbolSearchResultsForMarket(ranked, listingMarket);
  const results = finalizeSymbolSearchResults(
    (filtered.length > 0 ? filtered : ranked).slice(0, 8),
    listingMarket,
    query
  );

  return NextResponse.json({ results });
}
