type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function getScreenerCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setScreenerCache<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function screenerCacheTtlMs(marketOpen: boolean) {
  return marketOpen ? 5 * 60_000 : 30 * 60_000;
}

/** Keep an EOD snapshot warm on the instance until the next weekday close. */
export const SCREENER_EOD_CACHE_TTL_MS = 20 * 60 * 60 * 1000;
