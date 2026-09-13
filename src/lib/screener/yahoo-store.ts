import { isListingMarketOpen } from "@/lib/listing-market-hours";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import {
  getScreenerCache,
  SCREENER_EOD_CACHE_TTL_MS,
  screenerCacheTtlMs,
  setScreenerCache,
} from "@/lib/screener/cache";
import {
  getUniqueIndianStocks,
  type IndianSectorStock,
} from "@/lib/screener/indian-sectors";
import {
  readScreenerSnapshot,
  writeScreenerSnapshot,
} from "@/lib/screener/snapshot-store";
import { getNseScreenerSessionDate } from "@/lib/screener/session";
import {
  fetchYahooReturnSnapshot,
  yahooSymbolForNseTicker,
  type SymbolReturnSnapshot,
} from "@/lib/screener/yahoo-returns";

export const YAHOO_FETCH_CONCURRENCY = 16;

export type UniverseSnapshot = {
  stock: IndianSectorStock;
  snapshot: SymbolReturnSnapshot;
};

const inflight = new Map<string, Promise<SymbolReturnSnapshot>>();
let universeInflight: Promise<UniverseSnapshot[]> | null = null;

function persistTtlMs() {
  return isListingMarketOpen("IN_NSE")
    ? screenerCacheTtlMs(true)
    : SCREENER_EOD_CACHE_TTL_MS;
}

export async function loadYahooSnapshot(
  symbol: string,
  fresh = false
): Promise<SymbolReturnSnapshot> {
  const cacheKey = `yahoo:${symbol}`;
  if (!fresh) {
    const cached = getScreenerCache<SymbolReturnSnapshot>(cacheKey);
    if (cached) return cached;

    const pending = inflight.get(cacheKey);
    if (pending) return pending;
  }

  const request = (async () => {
    if (!fresh) {
      const stored = await readScreenerSnapshot<SymbolReturnSnapshot>(cacheKey);
      if (stored) {
        setScreenerCache(cacheKey, stored.payload, SCREENER_EOD_CACHE_TTL_MS);
        return stored.payload;
      }
    }

    const snapshot = await fetchYahooReturnSnapshot(symbol, { fresh });
    setScreenerCache(cacheKey, snapshot, persistTtlMs());
    return snapshot;
  })();

  inflight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (inflight.get(cacheKey) === request) inflight.delete(cacheKey);
  }
}

export async function loadUniverseSnapshots(
  fresh = false
): Promise<UniverseSnapshot[]> {
  if (!fresh && universeInflight) return universeInflight;

  const pending = (async () => {
    const universe = getUniqueIndianStocks();
    return mapWithConcurrency(universe, YAHOO_FETCH_CONCURRENCY, async (stock) => ({
      stock,
      snapshot: await loadYahooSnapshot(
        yahooSymbolForNseTicker(stock.ticker),
        fresh
      ),
    }));
  })();

  universeInflight = pending;
  try {
    return await pending;
  } catch (error) {
    if (universeInflight === pending) universeInflight = null;
    throw error;
  }
}

export async function persistComputedScreenerSnapshot<T>(
  snapshotKey: string,
  payload: T
) {
  setScreenerCache(snapshotKey, payload, SCREENER_EOD_CACHE_TTL_MS);
  if (isListingMarketOpen("IN_NSE")) return;
  await writeScreenerSnapshot(
    snapshotKey,
    getNseScreenerSessionDate(),
    payload
  );
}

export async function readComputedScreenerSnapshot<T>(
  snapshotKey: string
): Promise<T | null> {
  const cached = getScreenerCache<T>(snapshotKey);
  if (cached) return cached;

  const stored = await readScreenerSnapshot<T>(snapshotKey);
  if (!stored) return null;
  setScreenerCache(snapshotKey, stored.payload, SCREENER_EOD_CACHE_TTL_MS);
  return stored.payload;
}
