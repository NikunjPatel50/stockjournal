import { NextResponse } from "next/server";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import { normalizeQuoteAssetClass } from "@/lib/eodhd";
import { getCurrentUser } from "@/lib/supabase/server";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { prewarmNseEarningsCache } from "@/lib/nse-earnings";
import {
  earningsLookupKey,
  fetchNextEarningsDateForTrade,
  prewarmYahooEarningsCache,
  type EarningsDateInfo,
} from "@/lib/yahoo-earnings";

export const maxDuration = 30;

type EarningsRequestItem = {
  ticker?: string;
  assetClass?: string;
  listingMarket?: string;
};

const CURRENCIES = new Set<CurrencyCode>(["USD", "EUR", "GBP", "INR", "CAD"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    symbols?: EarningsRequestItem[];
    currency?: string;
  };

  const items = payload.symbols;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "symbols array is required" }, { status: 400 });
  }

  if (items.length > 40) {
    return NextResponse.json(
      { error: "Too many symbols (max 40 per request)" },
      { status: 400 }
    );
  }

  const currency = CURRENCIES.has(payload.currency as CurrencyCode)
    ? (payload.currency as CurrencyCode)
    : DEFAULT_CURRENCY;
  const defaultMarket = defaultListingMarketForCurrency(currency);

  const earnings: Record<string, EarningsDateInfo | null> = {};

  const hasIndianSymbols = items.some((item) => {
    const market = normalizeListingMarket(item.listingMarket ?? defaultMarket);
    return market === "IN_NSE" || market === "IN_BSE";
  });

  await Promise.all([
    hasIndianSymbols ? prewarmNseEarningsCache() : Promise.resolve(),
    prewarmYahooEarningsCache(),
  ]);

  await Promise.all(
    items.map(async (item) => {
      const ticker = item.ticker?.trim();
      if (!ticker) return;

      const assetClass = normalizeQuoteAssetClass(item.assetClass ?? "Equities");
      const key = earningsLookupKey(ticker, assetClass);
      if (assetClass !== "Equities") {
        earnings[key] = null;
        return;
      }

      const listingMarket = normalizeListingMarket(
        item.listingMarket ?? defaultMarket
      );

      earnings[key] = await fetchNextEarningsDateForTrade(
        ticker,
        assetClass,
        listingMarket
      );
    })
  );

  return NextResponse.json({
    earnings,
    fetchedAt: Date.now(),
  });
}
