import { NextResponse } from "next/server";
import {
  defaultEquityExchangeForCurrency,
  isLiveMarketQuote,
  normalizeQuoteAssetClass,
  quoteLookupKey,
  type EquityExchangeHint,
} from "@/lib/eodhd";
import { fetchMarketQuoteForTrade } from "@/lib/market-quote";
import { normalizeListingMarket } from "@/lib/equity-listing-markets";
import { getCurrentUser } from "@/lib/supabase/server";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";

type QuoteRequestItem = {
  ticker?: string;
  assetClass?: string;
  entryPrice?: number;
  listingMarket?: string;
};

const CURRENCIES = new Set<CurrencyCode>(["USD", "EUR", "GBP", "INR", "CAD"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.EODHD_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Market data is not configured (EODHD_API_KEY)." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    symbols?: QuoteRequestItem[];
    currency?: string;
    equityExchange?: EquityExchangeHint;
  };

  const items = payload.symbols;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "symbols array is required" }, { status: 400 });
  }

  if (items.length > 80) {
    return NextResponse.json(
      { error: "Too many symbols (max 80 per request)" },
      { status: 400 }
    );
  }

  const currency = CURRENCIES.has(payload.currency as CurrencyCode)
    ? (payload.currency as CurrencyCode)
    : DEFAULT_CURRENCY;
  const equityExchange =
    payload.equityExchange === "NSE" || payload.equityExchange === "US"
      ? payload.equityExchange
      : defaultEquityExchangeForCurrency(currency);

  const quotes: Record<
    string,
    {
      price: number | null;
      changePercent: number | null;
      timestamp: number | null;
      symbol: string | null;
      currency?: CurrencyCode;
      isLive: boolean;
    } | null
  > = {};

  try {
    await Promise.all(
      items.map(async (item) => {
        const ticker = String(item.ticker ?? "").trim();
        if (!ticker) return;

        const assetClass = normalizeQuoteAssetClass(item.assetClass);
        const key = quoteLookupKey(ticker, assetClass);

        if (assetClass === "Options") {
          quotes[key] = null;
          return;
        }

        try {
          const entryRaw = item.entryPrice;
          const entryPrice =
            typeof entryRaw === "number" && Number.isFinite(entryRaw)
              ? entryRaw
              : typeof entryRaw === "string"
                ? Number(entryRaw)
                : undefined;

          const quote = await fetchMarketQuoteForTrade(
            ticker,
            assetClass,
            apiKey,
            equityExchange,
            {
              entryPrice:
                entryPrice != null && Number.isFinite(entryPrice) && entryPrice > 0
                  ? entryPrice
                  : undefined,
              profileCurrency: currency,
              listingMarket: item.listingMarket
                ? normalizeListingMarket(item.listingMarket)
                : undefined,
            }
          );

          quotes[key] =
            quote === null
              ? null
              : {
                  price: quote.price,
                  changePercent: quote.changePercent,
                  timestamp: quote.timestamp,
                  symbol: quote.symbol,
                  currency: quote.currency,
                  isLive: isLiveMarketQuote(quote),
                };
        } catch {
          quotes[key] = null;
        }
      })
    );

    return NextResponse.json({
      quotes,
      delayed: false,
      fetchedAt: Date.now(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch market quotes";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
