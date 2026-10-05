import { NextResponse } from "next/server";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import {
  isJournalTickerSessionOpen,
  JOURNAL_TICKER_INSTRUMENTS,
  type JournalTickerQuote,
} from "@/lib/journal-ticker";
import type { CurrencyCode } from "@/lib/settings";
import { fetchYahooQuoteWithOhlc } from "@/lib/yahoo-equity-quote";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CACHE_TTL_OPEN_MS = 0;
const CACHE_TTL_CLOSED_MS = 30_000;

const SUPPORTED = new Set(["USD", "EUR", "GBP", "INR", "CAD"]);

let cache: {
  quotes: JournalTickerQuote[];
  fetchedAt: number;
  expiresAt: number;
} | null = null;

export async function GET() {
  const now = new Date();
  const anyOpen = JOURNAL_TICKER_INSTRUMENTS.some(
    (item) => item.session !== "crypto" && isJournalTickerSessionOpen(item, now)
  );
  const ttl = anyOpen ? CACHE_TTL_OPEN_MS : CACHE_TTL_CLOSED_MS;

  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(
      { quotes: cache.quotes, fetchedAt: cache.fetchedAt },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  const quotes = await mapWithConcurrency(
    JOURNAL_TICKER_INSTRUMENTS,
    8,
    async (instrument): Promise<JournalTickerQuote | null> => {
      const fallback = SUPPORTED.has(instrument.currency)
        ? (instrument.currency as CurrencyCode)
        : undefined;
      const quote = await fetchYahooQuoteWithOhlc(
        instrument.yahooSymbol,
        fallback,
        { fresh: true }
      );
      if (!quote?.price || quote.price <= 0) return null;

      const sessionOpen = isJournalTickerSessionOpen(instrument, now);
      const closePrice = quote.ohlc?.close ?? quote.price;
      const price = sessionOpen ? quote.price : closePrice;
      const change =
        quote.previousClose != null
          ? Math.round((price - quote.previousClose) * 100) / 100
          : null;

      return {
        id: instrument.id,
        label: instrument.label,
        price,
        change,
        changePercent: quote.changePercent,
        currency: quote.currency ?? instrument.currency,
        sessionOpen,
      };
    }
  );

  const payload = quotes.filter((row): row is JournalTickerQuote => row != null);
  const fetchedAt = Date.now();
  cache = { quotes: payload, fetchedAt, expiresAt: fetchedAt + ttl };

  return NextResponse.json(
    { quotes: payload, fetchedAt },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
