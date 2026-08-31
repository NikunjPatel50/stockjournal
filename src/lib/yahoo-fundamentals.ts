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

export type TickerFundamentals = {
  sector: string | null;
  marketCap: number | null;
  marketCapBucket: string | null;
  currency: CurrencyCode | null;
};

export function isUsableFundamentals(
  data: TickerFundamentals | null | undefined
): boolean {
  if (!data) return false;
  const sector = data.sector?.trim();
  const bucket = data.marketCapBucket?.trim();
  return Boolean(sector || (bucket && bucket !== "Unknown"));
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

type YahooNumeric = number | { raw?: number } | null | undefined;

export function parseYahooNumeric(value: YahooNumeric): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value === "object" &&
    typeof value.raw === "number" &&
    Number.isFinite(value.raw)
  ) {
    return value.raw;
  }
  return null;
}

type YahooFundamentalsRequest = {
  ticker: string;
  assetClass: AssetClass;
  listingMarket: ListingMarketId;
};

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

  const url = new URL(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}`
  );
  url.searchParams.set("modules", "assetProfile,summaryDetail");
  url.searchParams.set("crumb", resolvedAuth.crumb);

  try {
    const res = await fetchWithTimeout(
      url.toString(),
      {
        cache: "no-store",
        headers: {
          "User-Agent": YAHOO_USER_AGENT,
          Cookie: resolvedAuth.cookie,
          Accept: "application/json",
        },
      },
      YAHOO_FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;

    const payload = (await res.json()) as {
      quoteSummary?: {
        result?: Array<{
          assetProfile?: { sector?: string; industry?: string };
          summaryDetail?: { marketCap?: YahooNumeric };
        }>;
      };
    };

    const row = payload.quoteSummary?.result?.[0];
    const sectorOverride = lookupTickerSectorOverride(
      request.ticker,
      request.assetClass
    );
    const marketCapBucketOverride = lookupTickerMarketCapBucketOverride(
      request.ticker,
      request.assetClass
    );

    if (!row) {
      if (!sectorOverride && !marketCapBucketOverride) return null;
      const currency =
        request.listingMarket === "IN_NSE" || request.listingMarket === "IN_BSE"
          ? "INR"
          : "USD";
      return {
        sector: sectorOverride,
        marketCap: null,
        marketCapBucket: marketCapBucketOverride ?? "Unknown",
        currency,
      };
    }

    const sector = sectorOverride || row.assetProfile?.sector?.trim() || null;
    const currency =
      request.listingMarket === "IN_NSE" || request.listingMarket === "IN_BSE"
        ? "INR"
        : "USD";
    const marketCap = parseYahooNumeric(row.summaryDetail?.marketCap);

    return {
      sector,
      marketCap,
      marketCapBucket:
        marketCapBucketOverride ??
        classifyMarketCapBucket(marketCap, currency),
      currency,
    };
  } catch {
    return null;
  }
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
        (isUsableFundamentals(data) ? SERVER_CACHE_TTL_MS : 5 * 60 * 1000),
    });
    result[key] = data;
  });

  return result;
}
