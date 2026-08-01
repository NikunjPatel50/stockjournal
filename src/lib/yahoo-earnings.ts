import {
  getListingMarket,
  normalizeListingMarket,
  yahooSymbolForListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import { normalizeQuoteAssetClass, quoteLookupKey } from "@/lib/eodhd";
import type { AssetClass, JournalTrade } from "@/lib/journal-types";

export type EarningsDateInfo = {
  nextEarningsDate: string | null;
  isEstimate: boolean;
};

type YahooEarningsTimestamp = {
  raw?: number;
  fmt?: string;
};

let yahooAuthCache: {
  cookie: string;
  crumb: string;
  expiresAt: number;
} | null = null;

const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";

async function getYahooAuth(): Promise<{ cookie: string; crumb: string } | null> {
  if (yahooAuthCache && Date.now() < yahooAuthCache.expiresAt) {
    return yahooAuthCache;
  }

  try {
    const bootstrap = await fetch("https://fc.yahoo.com", {
      redirect: "manual",
      headers: { "User-Agent": YAHOO_USER_AGENT },
    });
    const setCookie = bootstrap.headers.getSetCookie?.() ?? [];
    const cookie = setCookie
      .map((entry) => entry.split(";")[0]?.trim())
      .filter(Boolean)
      .join("; ");
    if (!cookie) return null;

    const crumbRes = await fetch(
      "https://query2.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: {
          "User-Agent": YAHOO_USER_AGENT,
          Cookie: cookie,
        },
      }
    );
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb) return null;

    yahooAuthCache = {
      cookie,
      crumb,
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    return yahooAuthCache;
  } catch {
    return null;
  }
}

function pickNextEarningsDate(
  earningsDates: YahooEarningsTimestamp[],
  isEstimate: boolean
): EarningsDateInfo {
  const now = Math.floor(Date.now() / 1000);
  const upcoming = earningsDates
    .filter((entry) => typeof entry.raw === "number" && entry.raw >= now - 86_400)
    .sort((a, b) => (a.raw ?? 0) - (b.raw ?? 0));

  const next = upcoming[0];
  if (!next?.fmt) {
    return { nextEarningsDate: null, isEstimate: false };
  }

  return {
    nextEarningsDate: next.fmt,
    isEstimate,
  };
}

export async function fetchYahooNextEarningsDate(
  yahooSymbol: string
): Promise<EarningsDateInfo | null> {
  if (!yahooSymbol) return null;

  const auth = await getYahooAuth();
  if (!auth) return null;

  const url = new URL(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}`
  );
  url.searchParams.set("modules", "calendarEvents");
  url.searchParams.set("crumb", auth.crumb);

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "User-Agent": YAHOO_USER_AGENT,
        Cookie: auth.cookie,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as {
      quoteSummary?: {
        result?: Array<{
          calendarEvents?: {
            earnings?: {
              earningsDate?: YahooEarningsTimestamp[];
              isEarningsDateEstimate?: boolean;
            };
          };
        }>;
      };
    };

    const earnings =
      payload.quoteSummary?.result?.[0]?.calendarEvents?.earnings;
    if (!earnings) return { nextEarningsDate: null, isEstimate: false };

    return pickNextEarningsDate(
      earnings.earningsDate ?? [],
      earnings.isEarningsDateEstimate === true
    );
  } catch {
    return null;
  }
}

export function yahooSymbolForTrade(
  ticker: string,
  assetClass: AssetClass,
  listingMarket: ListingMarketId
): string | null {
  if (normalizeQuoteAssetClass(assetClass) !== "Equities") return null;
  return yahooSymbolForListingMarket(ticker, listingMarket) || null;
}

export function earningsLookupKey(ticker: string, assetClass: AssetClass): string {
  return quoteLookupKey(ticker, normalizeQuoteAssetClass(assetClass));
}

export type EarningsDateRequest = {
  ticker: string;
  assetClass: AssetClass;
  listingMarket: ListingMarketId;
};

export function uniqueEarningsRequests(
  trades: JournalTrade[],
  defaultMarket: ListingMarketId
): EarningsDateRequest[] {
  const seen = new Set<string>();
  const out: EarningsDateRequest[] = [];

  for (const trade of trades) {
    const assetClass = normalizeQuoteAssetClass(trade.assetClass);
    if (assetClass !== "Equities") continue;

    const key = earningsLookupKey(trade.ticker, assetClass);
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      ticker: trade.ticker,
      assetClass,
      listingMarket:
        trade.listingMarket != null
          ? normalizeListingMarket(trade.listingMarket)
          : defaultMarket,
    });
  }

  return out;
}

export async function fetchNextEarningsDateForTrade(
  ticker: string,
  assetClass: AssetClass,
  listingMarket: ListingMarketId
): Promise<EarningsDateInfo | null> {
  const yahooSymbol = yahooSymbolForTrade(ticker, assetClass, listingMarket);
  if (!yahooSymbol) return null;
  return fetchYahooNextEarningsDate(yahooSymbol);
}

export function earningsMarketLabel(marketId: ListingMarketId): string {
  return getListingMarket(marketId).label;
}
