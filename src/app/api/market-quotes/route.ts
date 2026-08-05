import { NextResponse } from "next/server";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import {
  defaultEquityExchangeForCurrency,
  eodhdSymbolCandidates,
  fetchEodhdRealtimeQuotesBatchOnly,
  isLiveMarketQuote,
  normalizeQuoteAssetClass,
  quoteLookupKey,
  type EquityExchangeHint,
  type MarketQuote,
} from "@/lib/eodhd";
import {
  resolveMarketQuoteFromSources,
} from "@/lib/market-quote";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { getCurrentUser } from "@/lib/supabase/server";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import {
  fetchYahooEquityQuoteForMarket,
} from "@/lib/yahoo-equity-quote";
import type { AssetClass } from "@/lib/journal-types";
import type { ListingMarketId } from "@/lib/equity-listing-markets";

type QuoteRequestItem = {
  ticker?: string;
  assetClass?: string;
  entryPrice?: number;
  listingMarket?: string;
};

const CURRENCIES = new Set<CurrencyCode>(["USD", "EUR", "GBP", "INR", "CAD"]);
const YAHOO_CONCURRENCY = 12;

const SERVER_CACHE_TTL_MS = 15_000;
const serverQuoteCache = new Map<
  string,
  { quote: MarketQuote; expiresAt: number }
>();

function pickFromEodhdBatch(
  candidates: string[],
  batch: Map<string, MarketQuote>
): MarketQuote | null {
  let fallback: MarketQuote | null = null;
  for (const symbol of candidates) {
    const hit = batch.get(symbol);
    if (hit?.price == null || hit.price <= 0) continue;
    if (isLiveMarketQuote(hit)) return hit;
    fallback ??= hit;
  }
  return fallback;
}

async function fetchYahooForItem(
  ticker: string,
  assetClass: AssetClass,
  listingMarket: ListingMarketId
): Promise<MarketQuote | null> {
  const cacheKey = `${ticker}::${assetClass}::${listingMarket}`;
  const cached = serverQuoteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.quote;
  }

  let quote: MarketQuote | null = null;

  if (assetClass === "Equities") {
    quote = await fetchYahooEquityQuoteForMarket(ticker, listingMarket!);
  }

  if (quote?.price != null && quote.price > 0) {
    serverQuoteCache.set(cacheKey, {
      quote,
      expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
    });
  }

  return quote;
}

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

  const normalizedItems = items
    .map((item) => {
      const ticker = String(item.ticker ?? "").trim();
      if (!ticker) return null;

      const assetClass = normalizeQuoteAssetClass(item.assetClass);
      const key = quoteLookupKey(ticker, assetClass);
      const entryRaw = item.entryPrice;
      const entryPrice =
        typeof entryRaw === "number" && Number.isFinite(entryRaw)
          ? entryRaw
          : typeof entryRaw === "string"
            ? Number(entryRaw)
            : undefined;
      const listingMarket = item.listingMarket
        ? normalizeListingMarket(item.listingMarket)
        : defaultListingMarketForCurrency(currency);

      return {
        ticker,
        assetClass,
        key,
        entryPrice:
          entryPrice != null && Number.isFinite(entryPrice) && entryPrice > 0
            ? entryPrice
            : undefined,
        listingMarket,
        candidates: eodhdSymbolCandidates(ticker, assetClass, equityExchange),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const eodhdSymbols = new Set<string>();
  for (const item of normalizedItems) {
    if (item.assetClass === "Options") continue;
    for (const symbol of item.candidates) {
      eodhdSymbols.add(symbol);
    }
  }

  const equityItems = normalizedItems.filter(
    (item) => item.assetClass === "Equities"
  );

  const [eodhdBatch, yahooByKey] = await Promise.all([
    eodhdSymbols.size > 0
      ? fetchEodhdRealtimeQuotesBatchOnly([...eodhdSymbols], apiKey).catch(
          () => new Map<string, MarketQuote>()
        )
      : Promise.resolve(new Map<string, MarketQuote>()),
    mapWithConcurrency(equityItems, YAHOO_CONCURRENCY, async (item) => {
      const yahoo = await fetchYahooForItem(
        item.ticker,
        item.assetClass,
        item.listingMarket
      );
      return { key: item.key, yahoo };
    }).then((rows) => {
      const map = new Map<string, MarketQuote | null>();
      for (const row of rows) {
        map.set(row.key, row.yahoo);
      }
      return map;
    }),
  ]);

  for (const item of normalizedItems) {
    if (item.assetClass === "Options") {
      quotes[item.key] = null;
      continue;
    }

    const eodhdQuote = pickFromEodhdBatch(item.candidates, eodhdBatch);
    const yahooQuote = yahooByKey.get(item.key) ?? null;
    const quote = resolveMarketQuoteFromSources(eodhdQuote, yahooQuote);

    quotes[item.key] =
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
  }

  return NextResponse.json({
    quotes,
    delayed: false,
    fetchedAt: Date.now(),
  });
}
