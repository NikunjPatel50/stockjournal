import type { AssetClass } from "@/lib/journal-types";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import { isUsableFundamentals } from "@/lib/yahoo-fundamentals";
import {
  fundamentalsLookupKey,
  type TickerFundamentals,
} from "@/lib/yahoo-fundamentals";

const STORAGE_KEY = "stl-fundamentals-v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = {
  data: TickerFundamentals;
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

export function readFundamentalsCache(
  keys: string[]
): Record<string, TickerFundamentals | null> {
  const store = readStore();
  const now = Date.now();
  const out: Record<string, TickerFundamentals | null> = {};

  for (const key of keys) {
    const entry = store[key];
    if (!entry || now - entry.fetchedAt > CACHE_TTL_MS) continue;
    if (!isUsableFundamentals(entry.data)) continue;
    out[key] = entry.data;
  }

  return out;
}

export function writeFundamentalsCache(
  entries: Record<string, TickerFundamentals | null>
) {
  const store = readStore();
  const fetchedAt = Date.now();

  for (const [key, data] of Object.entries(entries)) {
    if (!data || !isUsableFundamentals(data)) continue;
    store[key] = { data, fetchedAt };
  }

  writeStore(store);
}

export function fundamentalsCacheKeysForSymbols(
  symbols: Array<{
    ticker: string;
    assetClass: AssetClass;
    listingMarket: ListingMarketId;
  }>
): string[] {
  return symbols.map((symbol) =>
    fundamentalsLookupKey(
      symbol.ticker,
      symbol.assetClass,
      symbol.listingMarket
    )
  );
}

export function missingFundamentalsCacheKeys(
  keys: string[],
  cached: Record<string, TickerFundamentals | null>
): string[] {
  return keys.filter((key) => !isUsableFundamentals(cached[key]));
}
