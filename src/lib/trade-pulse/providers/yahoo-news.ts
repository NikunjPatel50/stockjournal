import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  getListingMarket,
  yahooSymbolForListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import type { TradePulseNewsItem } from "@/lib/trade-pulse/news-types";
import {
  parseRssDate,
  parseRssItems,
  sourceFromUrl,
  stripHtml,
} from "@/lib/trade-pulse/rss";

const YAHOO_NEWS_RSS = "https://feeds.finance.yahoo.com/rss/2.0/headline";
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";

function regionForMarket(listingMarket: ListingMarketId): string {
  const currency = getListingMarket(listingMarket).currency;
  if (currency === "INR") return "IN";
  if (currency === "GBP") return "GB";
  if (currency === "EUR") return "DE";
  if (currency === "CAD") return "CA";
  return "US";
}

export async function fetchYahooRecentNews(
  ticker: string,
  listingMarket: ListingMarketId,
  options: { hours?: number; limit?: number; asOf?: Date } = {}
): Promise<TradePulseNewsItem[]> {
  const symbol = yahooSymbolForListingMarket(ticker, listingMarket);
  if (!symbol) return [];

  const url = new URL(YAHOO_NEWS_RSS);
  url.searchParams.set("s", symbol);
  url.searchParams.set("region", regionForMarket(listingMarket));
  url.searchParams.set("lang", "en-US");

  const res = await fetchWithTimeout(
    url.toString(),
    {
      cache: "no-store",
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": USER_AGENT,
      },
    },
    FETCH_TIMEOUT_MS
  );

  if (!res.ok) return [];

  const xml = await res.text();
  const hours = options.hours ?? 48;
  const limit = options.limit ?? 8;
  const asOf = options.asOf ?? new Date();
  const cutoff = asOf.getTime() - hours * 60 * 60 * 1000;

  const items: TradePulseNewsItem[] = [];
  for (const item of parseRssItems(xml)) {
    const publishedAt = parseRssDate(item.pubDate);
    if (!publishedAt || publishedAt.getTime() < cutoff) continue;

    const summary = stripHtml(item.description ?? "");
    items.push({
      headline: item.title,
      source: item.source ?? sourceFromUrl(item.link) ?? "Yahoo Finance",
      publishedAt: publishedAt.toISOString(),
      summary: summary.slice(0, 280),
      url: item.link,
      provider: "yahoo",
    });

    if (items.length >= limit) break;
  }

  return items;
}
