import { NextResponse } from "next/server";
import {
  formatIndexPrice,
  MAJOR_MARKET_INDICES,
  type MarketIndexQuote,
} from "@/lib/major-market-indices";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import type { CurrencyCode } from "@/lib/settings";
import { getCurrentUser } from "@/lib/supabase/server";
import { fetchYahooQuoteWithOhlc } from "@/lib/yahoo-equity-quote";
import { anyMajorIndexMarketOpen } from "@/lib/major-market-indices";
import { isListingMarketOpen } from "@/lib/listing-market-hours";

const CACHE_TTL_OPEN_MS = 2_000;
const CACHE_TTL_CLOSED_MS = 30_000;
let cache: {
  payload: {
    indices: Record<string, MarketIndexQuote | null>;
    fetchedAt: number;
  };
  expiresAt: number;
} | null = null;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anyOpen = anyMajorIndexMarketOpen();
  const cacheTtl = anyOpen ? CACHE_TTL_OPEN_MS : CACHE_TTL_CLOSED_MS;

  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.payload);
  }

  const rows = await mapWithConcurrency(
    MAJOR_MARKET_INDICES,
    6,
    async (index) => {
      const fallback =
        index.currency === "JPY" ||
        index.currency === "KRW" ||
        index.currency === "CNY" ||
        index.currency === "HKD" ||
        index.currency === "AUD" ||
        index.currency === "BRL" ||
        index.currency === "SGD"
          ? undefined
          : (index.currency as CurrencyCode);

      const quote = await fetchYahooQuoteWithOhlc(
        index.yahooSymbol,
        fallback
      );

      if (!quote?.price || quote.price <= 0) {
        return { id: index.id, data: null };
      }

      const currency =
        quote.currency ??
        (typeof index.currency === "string" ? index.currency : "USD");
      const marketOpen = isListingMarketOpen(index.listingMarket);
      const isLive =
        marketOpen &&
        (quote.changePercent !== null ||
          (quote.timestamp !== null && quote.timestamp > 0));

      return {
        id: index.id,
        data: {
          price: quote.price,
          changePercent: quote.changePercent,
          currency,
          formattedPrice: formatIndexPrice(quote.price, currency),
          isLive,
          ohlc: quote.ohlc
            ? {
                ...quote.ohlc,
                formatted: {
                  open: formatIndexPrice(quote.ohlc.open, currency),
                  high: formatIndexPrice(quote.ohlc.high, currency),
                  low: formatIndexPrice(quote.ohlc.low, currency),
                  close: formatIndexPrice(quote.ohlc.close, currency),
                },
              }
            : null,
        } satisfies MarketIndexQuote,
      };
    }
  );

  const indices: Record<string, MarketIndexQuote | null> = {};
  for (const row of rows) {
    indices[row.id] = row.data;
  }

  const payload = { indices, fetchedAt: Date.now() };
  cache = { payload, expiresAt: Date.now() + cacheTtl };

  return NextResponse.json(payload);
}
