import type { CurrencyCode } from "@/lib/settings";

export type CachedMarketQuote = {
  price: number | null;
  changePercent: number | null;
  timestamp: number | null;
  currency?: CurrencyCode;
  isLive?: boolean;
};

const STORAGE_KEY = "stl-quotes-v1";
/** Past this age a cached price is still shown, but no longer counted as live. */
const LIVE_TTL_MS = 10_000;
/** How long a cached price is worth painting on load while a refetch runs. */
const DISPLAY_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = {
  data: CachedMarketQuote;
  fetchedAt: number;
};

type CacheStore = Record<string, CacheEntry>;

function readStore(): CacheStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota errors.
  }
}

/**
 * Stale-while-revalidate: a reload paints the last known price immediately
 * instead of a placeholder, and the poller corrects it a moment later. Prices
 * older than the live window are downgraded so nothing claims to be live.
 */
export function readQuotesCache(
  keys: string[]
): Record<string, CachedMarketQuote> {
  const store = readStore();
  const now = Date.now();
  const out: Record<string, CachedMarketQuote> = {};

  for (const key of keys) {
    const entry = store[key];
    if (!entry) continue;

    const age = now - entry.fetchedAt;
    if (age > DISPLAY_TTL_MS) continue;

    out[key] =
      age > LIVE_TTL_MS ? { ...entry.data, isLive: false } : entry.data;
  }

  return out;
}

export function writeQuotesCache(
  quotes: Record<string, CachedMarketQuote | null>
) {
  const store = readStore();
  const fetchedAt = Date.now();

  for (const [key, data] of Object.entries(quotes)) {
    if (!data || data.price == null || data.price <= 0) continue;
    store[key] = { data, fetchedAt };
  }

  writeStore(store);
}
