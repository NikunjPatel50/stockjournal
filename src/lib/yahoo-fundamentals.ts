import type { ListingMarketId } from "@/lib/equity-listing-markets";
import { yahooSymbolForListingMarket } from "@/lib/equity-listing-markets";
import type { AssetClass } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getYahooAuth } from "@/lib/yahoo-earnings";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";

const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";
const YAHOO_FETCH_TIMEOUT_MS = 6000;

export type TickerFundamentals = {
  sector: string | null;
  marketCap: number | null;
  marketCapBucket: string | null;
  currency: CurrencyCode | null;
};

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

function mapYahooCurrency(value?: string): CurrencyCode | null {
  const code = value?.trim().toUpperCase();
  if (
    code === "USD" ||
    code === "EUR" ||
    code === "GBP" ||
    code === "INR" ||
    code === "CAD"
  ) {
    return code;
  }
  return null;
}

type YahooFundamentalsRequest = {
  ticker: string;
  assetClass: AssetClass;
  listingMarket: ListingMarketId;
};

export async function fetchYahooFundamentals(
  request: YahooFundamentalsRequest
): Promise<TickerFundamentals | null> {
  if (request.assetClass !== "Equities") return null;

  const yahooSymbol = yahooSymbolForListingMarket(
    request.ticker,
    request.listingMarket
  );
  if (!yahooSymbol) return null;

  const auth = await getYahooAuth();
  if (!auth) return null;

  const url = new URL(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}`
  );
  url.searchParams.set(
    "modules",
    "assetProfile,summaryDetail,price,defaultKeyStatistics"
  );
  url.searchParams.set("crumb", auth.crumb);

  try {
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
      quoteSummary?: {
        result?: Array<{
          assetProfile?: { sector?: string; industry?: string };
          summaryDetail?: { marketCap?: YahooNumeric };
          price?: { marketCap?: YahooNumeric; currency?: string };
          defaultKeyStatistics?: { marketCap?: YahooNumeric };
        }>;
      };
    };

    const row = payload.quoteSummary?.result?.[0];
    if (!row) return null;

    const sector = row.assetProfile?.sector?.trim() || null;
    const currency =
      mapYahooCurrency(row.price?.currency) ??
      (request.listingMarket === "IN_NSE" || request.listingMarket === "IN_BSE"
        ? "INR"
        : "USD");
    const marketCap =
      parseYahooNumeric(row.summaryDetail?.marketCap) ??
      parseYahooNumeric(row.price?.marketCap) ??
      parseYahooNumeric(row.defaultKeyStatistics?.marketCap);

    return {
      sector,
      marketCap,
      marketCapBucket: classifyMarketCapBucket(marketCap, currency),
      currency,
    };
  } catch {
    return null;
  }
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

  const entries = await Promise.all(
    [...unique.entries()].map(async ([key, request]) => {
      const data = await fetchYahooFundamentals(request);
      return [key, data] as const;
    })
  );

  return Object.fromEntries(entries);
}
