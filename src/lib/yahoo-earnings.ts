import { addDays, format, parseISO, startOfDay } from "date-fns";
import {
  getListingMarket,
  normalizeListingMarket,
  yahooSymbolForListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import { fetchWithTimeout, extractResponseCookies } from "@/lib/fetch-with-timeout";
import { fetchNseNextEarningsDate } from "@/lib/nse-earnings";

const YAHOO_FETCH_TIMEOUT_MS = 6000;
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

type YahooEarningsTrend = {
  period?: string;
  endDate?: string | null;
};

let yahooAuthCache: {
  cookie: string;
  crumb: string;
  expiresAt: number;
} | null = null;

const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";
const INDIA_REPORTING_LAG_DAYS = 40;
const DEFAULT_REPORTING_LAG_DAYS = 30;

export async function prewarmYahooEarningsCache(): Promise<void> {
  await getYahooAuth();
}

async function getYahooAuth(): Promise<{ cookie: string; crumb: string } | null> {
  if (yahooAuthCache && Date.now() < yahooAuthCache.expiresAt) {
    return yahooAuthCache;
  }

  try {
    const bootstrap = await fetchWithTimeout(
      "https://fc.yahoo.com",
      {
        redirect: "manual",
        headers: { "User-Agent": YAHOO_USER_AGENT },
      },
      YAHOO_FETCH_TIMEOUT_MS
    );
    const cookie = extractResponseCookies(bootstrap);
    if (!cookie) return null;

    const crumbRes = await fetchWithTimeout(
      "https://query2.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: {
          "User-Agent": YAHOO_USER_AGENT,
          Cookie: cookie,
        },
      },
      YAHOO_FETCH_TIMEOUT_MS
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

function normalizeYahooDate(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return format(new Date(parsed), "yyyy-MM-dd");
}

function pickNextCalendarEarningsDate(
  earningsDates: YahooEarningsTimestamp[],
  isEstimate: boolean
): EarningsDateInfo | null {
  const now = Math.floor(Date.now() / 1000);
  const upcoming = earningsDates
    .filter((entry) => typeof entry.raw === "number" && entry.raw >= now - 86_400)
    .sort((a, b) => (a.raw ?? 0) - (b.raw ?? 0));

  const next = upcoming[0];
  if (!next?.fmt) return null;

  const normalized = normalizeYahooDate(next.fmt);
  if (!normalized) return null;

  return {
    nextEarningsDate: normalized,
    isEstimate,
  };
}

function pickEstimatedEarningsFromTrend(
  trends: YahooEarningsTrend[],
  reportingLagDays: number
): EarningsDateInfo | null {
  const today = startOfDay(new Date());
  let best: Date | null = null;

  for (const trend of trends) {
    if (!trend.endDate) continue;
    const quarterEnd = parseISO(trend.endDate);
    if (Number.isNaN(quarterEnd.getTime())) continue;

    const estimatedAnnouncement = addDays(startOfDay(quarterEnd), reportingLagDays);
    if (estimatedAnnouncement < today) continue;
    if (!best || estimatedAnnouncement < best) {
      best = estimatedAnnouncement;
    }
  }

  if (!best) return null;
  return {
    nextEarningsDate: format(best, "yyyy-MM-dd"),
    isEstimate: true,
  };
}

function pickEstimatedEarningsFromMostRecentQuarter(
  rawSeconds: number,
  reportingLagDays: number
): EarningsDateInfo | null {
  const today = startOfDay(new Date());
  let quarterEnd = startOfDay(new Date(rawSeconds * 1000));

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const estimatedAnnouncement = addDays(quarterEnd, reportingLagDays);
    if (estimatedAnnouncement >= today) {
      return {
        nextEarningsDate: format(estimatedAnnouncement, "yyyy-MM-dd"),
        isEstimate: true,
      };
    }
    quarterEnd = addDays(quarterEnd, 90);
  }

  return null;
}

function isIndianListingMarket(listingMarket: ListingMarketId) {
  return listingMarket === "IN_NSE" || listingMarket === "IN_BSE";
}

export async function fetchYahooNextEarningsDate(
  yahooSymbol: string,
  listingMarket: ListingMarketId = "US"
): Promise<EarningsDateInfo | null> {
  if (!yahooSymbol) return null;

  const auth = await getYahooAuth();
  if (!auth) return null;

  const url = new URL(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}`
  );
  url.searchParams.set(
    "modules",
    "calendarEvents,earningsTrend,defaultKeyStatistics"
  );
  url.searchParams.set("crumb", auth.crumb);

  const reportingLagDays = isIndianListingMarket(listingMarket)
    ? INDIA_REPORTING_LAG_DAYS
    : DEFAULT_REPORTING_LAG_DAYS;

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
          calendarEvents?: {
            earnings?: {
              earningsDate?: YahooEarningsTimestamp[];
              isEarningsDateEstimate?: boolean;
            };
          };
          earningsTrend?: {
            trend?: YahooEarningsTrend[];
          };
          defaultKeyStatistics?: {
            mostRecentQuarter?: YahooEarningsTimestamp;
          };
        }>;
      };
    };

    const result = payload.quoteSummary?.result?.[0];
    if (!result) return null;

    const calendar = result.calendarEvents?.earnings;
    const fromCalendar = pickNextCalendarEarningsDate(
      calendar?.earningsDate ?? [],
      calendar?.isEarningsDateEstimate === true
    );
    if (fromCalendar?.nextEarningsDate) return fromCalendar;

    const fromTrend = pickEstimatedEarningsFromTrend(
      result.earningsTrend?.trend ?? [],
      reportingLagDays
    );
    if (fromTrend?.nextEarningsDate) return fromTrend;

    const mostRecentQuarter = result.defaultKeyStatistics?.mostRecentQuarter?.raw;
    if (typeof mostRecentQuarter === "number") {
      return pickEstimatedEarningsFromMostRecentQuarter(
        mostRecentQuarter,
        reportingLagDays
      );
    }

    return { nextEarningsDate: null, isEstimate: false };
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
  if (normalizeQuoteAssetClass(assetClass) !== "Equities") return null;

  if (isIndianListingMarket(listingMarket)) {
    const nse = await fetchNseNextEarningsDate(ticker);
    if (nse?.nextEarningsDate) return nse;
  }

  const yahooSymbol = yahooSymbolForTrade(ticker, assetClass, listingMarket);
  if (!yahooSymbol) return null;
  return fetchYahooNextEarningsDate(yahooSymbol, listingMarket);
}

export function earningsMarketLabel(marketId: ListingMarketId): string {
  return getListingMarket(marketId).label;
}

export function parseEarningsDisplayDate(value: string): Date | null {
  const normalized = normalizeYahooDate(value);
  if (!normalized) return null;
  const parsed = parseISO(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
