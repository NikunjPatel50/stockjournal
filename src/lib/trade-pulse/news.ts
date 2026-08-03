import { defaultListingMarketForCurrency } from "@/lib/equity-listing-markets";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import type {
  RecentNewsOptions,
  TradePulseNewsItem,
} from "@/lib/trade-pulse/news-types";
import { fetchGoogleRecentNews } from "@/lib/trade-pulse/providers/google-news";
import { fetchYahooRecentNews } from "@/lib/trade-pulse/providers/yahoo-news";

/**
 * Fetches recent headlines for a ticker.
 * Uses Yahoo Finance RSS first, then Google News RSS when Yahoo has no matches.
 */
export async function getRecentNews(
  ticker: string,
  hours = 48,
  options: RecentNewsOptions = {}
): Promise<TradePulseNewsItem[]> {
  const listingMarket =
    options.listingMarket ?? defaultListingMarketForCurrency(DEFAULT_CURRENCY);
  const limit = options.limit ?? 8;
  const asOf = options.asOf ?? new Date();

  const yahooNews = await fetchYahooRecentNews(ticker, listingMarket, {
    hours,
    limit,
    asOf,
  });
  if (yahooNews.length > 0) return yahooNews;

  return fetchGoogleRecentNews(ticker, listingMarket, {
    hours,
    limit,
    asOf,
    companyName: options.companyName,
  });
}
