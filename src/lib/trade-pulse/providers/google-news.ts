import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getListingMarket, type ListingMarketId } from "@/lib/equity-listing-markets";
import type { TradePulseNewsItem } from "@/lib/trade-pulse/news-types";
import {
  parseRssDate,
  parseRssItems,
  sourceFromUrl,
  stripHtml,
} from "@/lib/trade-pulse/rss";

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";

function exchangeLabel(listingMarket: ListingMarketId): string {
  switch (listingMarket) {
    case "IN_NSE":
      return "NSE";
    case "IN_BSE":
      return "BSE";
    case "UK":
      return "LSE";
    case "CA":
      return "TSX";
    default:
      return getListingMarket(listingMarket).label.split("—")[0]?.trim() ?? "";
  }
}

export function buildGoogleNewsQuery(
  ticker: string,
  listingMarket: ListingMarketId,
  companyName?: string
): string {
  const exchange = exchangeLabel(listingMarket);
  if (companyName?.trim()) {
    return `"${companyName.trim()}" ${exchange} stock`;
  }
  return `${ticker.trim()} ${exchange} stock`;
}

export async function fetchGoogleRecentNews(
  ticker: string,
  listingMarket: ListingMarketId,
  options: {
    hours?: number;
    limit?: number;
    asOf?: Date;
    companyName?: string;
  } = {}
): Promise<TradePulseNewsItem[]> {
  const query = buildGoogleNewsQuery(ticker, listingMarket, options.companyName);
  const url = new URL(GOOGLE_NEWS_RSS);
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-IN");
  url.searchParams.set("gl", "IN");
  url.searchParams.set("ceid", "IN:en");

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
      source: item.source ?? sourceFromUrl(item.link) ?? "Google News",
      publishedAt: publishedAt.toISOString(),
      summary: summary.slice(0, 280),
      url: item.link,
      provider: "google",
    });

    if (items.length >= limit) break;
  }

  return items;
}
