import type { CurrencyCode } from "@/lib/settings";

export type CachedMarketQuote = {
  price: number | null;
  changePercent: number | null;
  timestamp: number | null;
  currency?: CurrencyCode;
  isLive?: boolean;
};

const STORAGE_KEY = "stl-quotes-v1";
const LIVE_TTL_MS = 30_000;
const STALE_TTL_MS = 10 * 60 * 1000;

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

function entryTtl(entry: CacheEntry): number {
  return entry.data.isLive === true ? LIVE_TTL_MS : STALE_TTL_MS;
}

export function readQuotesCache(
  keys: string[]
): Record<string, CachedMarketQuote> {
  const store = readStore();
  const now = Date.now();
  const out: Record<string, CachedMarketQuote> = {};

  for (const key of keys) {
    const entry = store[key];
    if (!entry || now - entry.fetchedAt > entryTtl(entry)) continue;
    out[key] = entry.data;
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
