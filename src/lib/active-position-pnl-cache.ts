import type { DailyPnlPoint } from "@/lib/analytics";

const STORAGE_KEY = "stl-active-pnl-v1";
const TTL_MS = 30 * 60 * 1000;

export type CachedActivePositionPnl = {
  daily: DailyPnlPoint[];
  priorSessionBarByTradeId: Record<string, boolean>;
  fetchedAt: number;
};

type CacheStore = Record<string, CachedActivePositionPnl>;

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

export function readActivePositionPnlCache(
  cacheKey: string
): CachedActivePositionPnl | null {
  const entry = readStore()[cacheKey];
  if (!entry || Date.now() - entry.fetchedAt > TTL_MS) return null;
  if (!Array.isArray(entry.daily)) return null;
  return entry;
}

export function writeActivePositionPnlCache(
  cacheKey: string,
  payload: Omit<CachedActivePositionPnl, "fetchedAt">
) {
  const store = readStore();
  store[cacheKey] = {
    ...payload,
    fetchedAt: Date.now(),
  };
  writeStore(store);
}
