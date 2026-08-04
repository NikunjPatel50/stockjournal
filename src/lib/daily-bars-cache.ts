import type { ListingMarketId } from "@/lib/equity-listing-markets";
import type { OhlcvBar } from "@/lib/trade-pulse/types";

const TTL_MS = 4 * 60 * 60 * 1000;

type CacheEntry = {
  bars: OhlcvBar[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(ticker: string, listingMarket: ListingMarketId): string {
  return `${ticker.trim().toUpperCase()}:${listingMarket}`;
}

export async function fetchDailyBarsCached(
  ticker: string,
  listingMarket: ListingMarketId,
  fetcher: () => Promise<OhlcvBar[]>
): Promise<OhlcvBar[]> {
  const key = cacheKey(ticker, listingMarket);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.bars;
  }

  const bars = await fetcher();
  cache.set(key, { bars, expiresAt: Date.now() + TTL_MS });
  return bars;
}
