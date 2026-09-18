import type { ListingMarketId } from "@/lib/equity-listing-markets";
import { yahooSymbolForListingMarket } from "@/lib/equity-listing-markets";
import type { AssetClass } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getYahooAuth } from "@/lib/yahoo-earnings";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import { lookupTickerSectorOverride, lookupTickerMarketCapBucketOverride } from "@/lib/ticker-sector-overrides";

const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";
const YAHOO_FETCH_TIMEOUT_MS = 6000;
const QUOTE_SUMMARY_MODULES =
  "assetProfile,summaryDetail,price,defaultKeyStatistics";

export type TickerFundamentals = {
  sector: string | null;
  marketCap: number | null;
  marketCapBucket: string | null;
  currency: CurrencyCode | null;
};

export function isKnownMarketCapBucket(
  bucket: string | null | undefined
): boolean {
  const value = bucket?.trim();
  return Boolean(value && value !== "Unknown");
}

export function hasUsableMarketCapBucket(
  data: TickerFundamentals | null | undefined
): boolean {
  if (!data) return false;
  if (isKnownMarketCapBucket(data.marketCapBucket)) return true;
  return (
    data.marketCap != null &&
    Number.isFinite(data.marketCap) &&
    data.marketCap > 0
  );
}

export function isUsableFundamentals(
  data: TickerFundamentals | null | undefined
): boolean {
  if (!data) return false;
  return Boolean(data.sector?.trim()) || hasUsableMarketCapBucket(data);
}

export function resolvedMarketCapBucket(
  bucket: string | null | undefined,
  marketCap: number | null | undefined,
  currency: CurrencyCode | string | null
): string | null {
  if (isKnownMarketCapBucket(bucket)) return bucket!.trim();
  const classified = classifyMarketCapBucket(marketCap ?? null, currency);
  return isKnownMarketCapBucket(classified) ? classified : null;
}

export function fundamentalsLookupKey(
  ticker: string,
  assetClass: AssetClass,
  listingMarket: ListingMarketId
): string {
  return `${normalizeEquityTicker(ticker)}|${assetClass}|${listingMarket}`;
}

export function classifyMarketCapBucket(
  marketCap: number | null,
  currency: CurrencyCode | string | null
): string {
  if (marketCap == null || !Number.isFinite(marketCap) || marketCap <= 0) {
    return "Unknown";
  }

  const cur = (currency ?? "USD").toUpperCase();

  if (cur === "INR") {
    const capInCrore = marketCap / 10_000_000;
    if (capInCrore >= 20_000) return "Large cap";
    if (capInCrore >= 5_000) return "Mid cap";
    if (capInCrore >= 500) return "Small cap";
    return "Micro cap";
  }

  if (marketCap >= 10_000_000_000) return "Large cap";
  if (marketCap >= 2_000_000_000) return "Mid cap";
  if (marketCap >= 300_000_000) return "Small cap";
  return "Micro cap";
}

type YahooNumeric =
  | number
  | string
  | { raw?: number | string }
  | null
  | undefined;

export function parseYahooNumeric(value: YahooNumeric): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object") {
    return parseYahooNumeric(value.raw);
  }
  return null;
}

type YahooFundamentalsRequest = {
  ticker: string;
  assetClass: AssetClass;
  listingMarket: ListingMarketId;
};

type YahooQuoteSummaryRow = {
  assetProfile?: { sector?: string; industry?: string };
  summaryDetail?: { marketCap?: YahooNumeric; currency?: string };
  price?: {
    marketCap?: YahooNumeric;
    currency?: string;
    regularMarketPrice?: YahooNumeric;
  };
  defaultKeyStatistics?: {
    marketCap?: YahooNumeric;
    sharesOutstanding?: YahooNumeric;
    impliedSharesOutstanding?: YahooNumeric;
  };
};

function listingCurrency(marketId: ListingMarketId): CurrencyCode {
  return marketId === "IN_NSE" || marketId === "IN_BSE" ? "INR" : "USD";
}

function firstPositiveNumeric(
  ...values: Array<YahooNumeric | number | null | undefined>
): number | null {
  for (const value of values) {
    const parsed = parseYahooNumeric(value as YahooNumeric);
    if (parsed != null && parsed > 0) return parsed;
  }
  return null;
}

function marketCapFromQuoteSummary(row: YahooQuoteSummaryRow): number | null {
  const direct = firstPositiveNumeric(
    row.summaryDetail?.marketCap,
    row.price?.marketCap,
    row.defaultKeyStatistics?.marketCap
  );
  if (direct != null) return direct;

  const price = firstPositiveNumeric(row.price?.regularMarketPrice);
  const shares = firstPositiveNumeric(
    row.defaultKeyStatistics?.sharesOutstanding,
    row.defaultKeyStatistics?.impliedSharesOutstanding
  );
  if (price == null || shares == null) return null;
  const implied = price * shares;
  return Number.isFinite(implied) && implied > 0 ? implied : null;
}

function indianYahooSymbolFallbacks(
  yahooSymbol: string,
  marketId: ListingMarketId
): string[] {
  const symbols = [yahooSymbol];
  if (marketId !== "IN_NSE" && marketId !== "IN_BSE") return symbols;
  if (yahooSymbol.endsWith(".NS")) {
    symbols.push(`${yahooSymbol.slice(0, -3)}.BO`);
  } else if (yahooSymbol.endsWith(".BO")) {
    symbols.push(`${yahooSymbol.slice(0, -3)}.NS`);
  }
  return symbols;
}

async function fetchYahooQuoteSummaryRow(
  yahooSymbol: string,
  auth: { cookie: string; crumb: string }
): Promise<YahooQuoteSummaryRow | null> {
  const url = new URL(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}`
  );
  url.searchParams.set("modules", QUOTE_SUMMARY_MODULES);
  url.searchParams.set("crumb", auth.crumb);

  const res = await fetchWithTimeout(
    url.toString(),
    {
      cache: "no-store",
      headers: {
        "User-Agent": YAHOO_USER_AGENT,
        Cookie: auth.cookie,
        Accept: "application/json",
      },
    },
    YAHOO_FETCH_TIMEOUT_MS
  );
  if (!res.ok) return null;

  const payload = (await res.json()) as {
    quoteSummary?: { result?: YahooQuoteSummaryRow[] };
  };
  return payload.quoteSummary?.result?.[0] ?? null;
}

async function fetchYahooQuoteMarketCap(
  yahooSymbol: string,
  auth: { cookie: string; crumb: string }
): Promise<number | null> {
  const url = new URL("https://query2.finance.yahoo.com/v7/finance/quote");
  url.searchParams.set("symbols", yahooSymbol);
  url.searchParams.set("crumb", auth.crumb);
  url.searchParams.set("fields", "marketCap,sharesOutstanding,regularMarketPrice");

  const res = await fetchWithTimeout(
    url.toString(),
    {
      cache: "no-store",
      headers: {
        "User-Agent": YAHOO_USER_AGENT,
        Cookie: auth.cookie,
        Accept: "application/json",
      },
    },
    YAHOO_FETCH_TIMEOUT_MS
  );
  if (!res.ok) return null;

  const payload = (await res.json()) as {
    quoteResponse?: {
      result?: Array<{
        marketCap?: YahooNumeric;
        sharesOutstanding?: YahooNumeric;
        regularMarketPrice?: YahooNumeric;
      }>;
    };
  };
  const quote = payload.quoteResponse?.result?.[0];
  if (!quote) return null;

  const direct = firstPositiveNumeric(quote.marketCap);
  if (direct != null) return direct;

  const price = firstPositiveNumeric(quote.regularMarketPrice);
  const shares = firstPositiveNumeric(quote.sharesOutstanding);
  if (price == null || shares == null) return null;
  const implied = price * shares;
  return Number.isFinite(implied) && implied > 0 ? implied : null;
}

function fundamentalsResult(input: {
  sector: string | null;
  marketCap: number | null;
  marketCapBucketOverride: string | null;
  currency: CurrencyCode;
}): TickerFundamentals | null {
  const marketCapBucket =
    input.marketCapBucketOverride ??
    resolvedMarketCapBucket(null, input.marketCap, input.currency);

  if (!input.sector && !marketCapBucket && input.marketCap == null) {
    return null;
  }

  return {
    sector: input.sector,
    marketCap: input.marketCap,
    marketCapBucket,
    currency: input.currency,
  };
}

export async function fetchYahooFundamentals(
  request: YahooFundamentalsRequest,
  auth?: { cookie: string; crumb: string } | null
): Promise<TickerFundamentals | null> {
  if (request.assetClass !== "Equities") return null;

  const yahooSymbol = yahooSymbolForListingMarket(
    request.ticker,
    request.listingMarket
  );
  if (!yahooSymbol) return null;

  const resolvedAuth = auth ?? (await getYahooAuth());
  if (!resolvedAuth) return null;

  const sectorOverride = lookupTickerSectorOverride(
    request.ticker,
    request.assetClass
  );
  const marketCapBucketOverride = lookupTickerMarketCapBucketOverride(
    request.ticker,
    request.assetClass
  );
  const currency = listingCurrency(request.listingMarket);
  const symbolsToTry = indianYahooSymbolFallbacks(
    yahooSymbol,
    request.listingMarket
  );

  let row: YahooQuoteSummaryRow | null = null;
  let marketCap: number | null = null;

  for (const symbol of symbolsToTry) {
    try {
      const nextRow = await fetchYahooQuoteSummaryRow(symbol, resolvedAuth);
      if (!nextRow) continue;
      if (!row) row = nextRow;
      const nextCap = marketCapFromQuoteSummary(nextRow);
      if (nextCap != null) {
        row = nextRow;
        marketCap = nextCap;
        break;
      }
    } catch {
      // Try the next listing suffix / quote endpoint.
    }
  }

  if (marketCap == null) {
    for (const symbol of symbolsToTry) {
      try {
        marketCap = await fetchYahooQuoteMarketCap(symbol, resolvedAuth);
        if (marketCap != null) break;
      } catch {
        marketCap = null;
      }
    }
  }

  const sector =
    sectorOverride || row?.assetProfile?.sector?.trim() || null;

  return fundamentalsResult({
    sector,
    marketCap,
    marketCapBucketOverride,
    currency,
  });
}

const SERVER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_CONCURRENCY = 6;

const serverFundamentalsCache = new Map<
  string,
  { data: TickerFundamentals | null; expiresAt: number }
>();

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function fetchFundamentalsBatch(
  requests: YahooFundamentalsRequest[]
): Promise<Record<string, TickerFundamentals | null>> {
  const unique = new Map<string, YahooFundamentalsRequest>();
  for (const request of requests) {
    if (request.assetClass !== "Equities") continue;
    const key = fundamentalsLookupKey(
      request.ticker,
      request.assetClass,
      request.listingMarket
    );
    if (!unique.has(key)) unique.set(key, request);
  }

  const result: Record<string, TickerFundamentals | null> = {};
  const toFetch: Array<[string, YahooFundamentalsRequest]> = [];
  const now = Date.now();

  for (const [key, request] of unique) {
    const cached = serverFundamentalsCache.get(key);
    if (cached && now < cached.expiresAt) {
      result[key] = cached.data;
      continue;
    }
    toFetch.push([key, request]);
  }

  if (toFetch.length === 0) return result;

  const auth = await getYahooAuth();

  await mapWithConcurrency(toFetch, FETCH_CONCURRENCY, async ([key, request]) => {
    const data = await fetchYahooFundamentals(request, auth);
    serverFundamentalsCache.set(key, {
      data,
      expiresAt:
        Date.now() +
        (hasUsableMarketCapBucket(data)
          ? SERVER_CACHE_TTL_MS
          : 5 * 60 * 1000),
    });
    result[key] = data;
  });

  return result;
}
