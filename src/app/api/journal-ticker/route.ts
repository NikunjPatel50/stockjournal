import { NextResponse } from "next/server";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import {
  isJournalTickerSessionOpen,
  JOURNAL_TICKER_INSTRUMENTS,
  type JournalTickerQuote,
} from "@/lib/journal-ticker";
import type { CurrencyCode } from "@/lib/settings";
import { fetchYahooQuoteWithOhlc } from "@/lib/yahoo-equity-quote";

const CACHE_TTL_OPEN_MS = 8_000;
const CACHE_TTL_CLOSED_MS = 60_000;

const SUPPORTED = new Set(["USD", "EUR", "GBP", "INR", "CAD"]);

let cache: {
  quotes: JournalTickerQuote[];
  fetchedAt: number;
  expiresAt: number;
} | null = null;

export async function GET() {
  const now = new Date();
  const anyOpen = JOURNAL_TICKER_INSTRUMENTS.some((item) =>
    isJournalTickerSessionOpen(item, now)
  );
  const ttl = anyOpen ? CACHE_TTL_OPEN_MS : CACHE_TTL_CLOSED_MS;

  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json({ quotes: cache.quotes, fetchedAt: cache.fetchedAt });
  }

  const quotes = await mapWithConcurrency(
    JOURNAL_TICKER_INSTRUMENTS,
    4,
    async (instrument): Promise<JournalTickerQuote | null> => {
      const fallback = SUPPORTED.has(instrument.currency)
        ? (instrument.currency as CurrencyCode)
        : undefined;
      const quote = await fetchYahooQuoteWithOhlc(
        instrument.yahooSymbol,
        fallback
      );
      if (!quote?.price || quote.price <= 0) return null;

      const sessionOpen = isJournalTickerSessionOpen(instrument, now);
      const closePrice = quote.ohlc?.close ?? quote.price;
      const price = sessionOpen ? quote.price : closePrice;

      return {
        id: instrument.id,
        label: instrument.label,
        price,
        changePercent: quote.changePercent,
        currency: quote.currency ?? instrument.currency,
        sessionOpen,
      };
    }
  );

  const payload = quotes.filter((row): row is JournalTickerQuote => row != null);
  const fetchedAt = Date.now();
  cache = { quotes: payload, fetchedAt, expiresAt: fetchedAt + ttl };

  return NextResponse.json({ quotes: payload, fetchedAt });
}
