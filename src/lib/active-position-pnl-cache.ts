import type { DailyPnlPoint } from "@/lib/analytics";
import type { ActivePositionPnlInput } from "@/lib/active-position-daily-pnl";
import type { CurrencyCode } from "@/lib/settings";

const STORAGE_KEY = "stl-active-pnl-v1";
const TTL_MS = 30 * 60 * 1000;

export type CachedActivePositionPnl = {
  daily: DailyPnlPoint[];
  priorSessionBarByTradeId: Record<string, boolean>;
  fetchedAt: number;
};

type CacheStore = Record<string, CachedActivePositionPnl>;

const memory = new Map<string, CachedActivePositionPnl>();
const inflight = new Map<string, Promise<CachedActivePositionPnl>>();

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

export function activePositionPnlCacheKey(
  trades: Pick<ActivePositionPnlInput, "id" | "quantity" | "entryPrice" | "entryDate">[],
  currency: CurrencyCode
) {
  return `${currency}:${trades
    .map(
      (trade) =>
        `${trade.id}:${trade.quantity}:${trade.entryPrice}:${trade.entryDate}`
    )
    .join("|")}`;
}

function isFresh(entry: CachedActivePositionPnl) {
  return Date.now() - entry.fetchedAt <= TTL_MS && Array.isArray(entry.daily);
}

export function readActivePositionPnlCache(
  cacheKey: string
): CachedActivePositionPnl | null {
  const mem = memory.get(cacheKey);
  if (mem && isFresh(mem)) return mem;

  const entry = readStore()[cacheKey];
  if (!entry || !isFresh(entry)) return null;
  memory.set(cacheKey, entry);
  return entry;
}

export function writeActivePositionPnlCache(
  cacheKey: string,
  payload: Omit<CachedActivePositionPnl, "fetchedAt">
) {
  const entry: CachedActivePositionPnl = {
    ...payload,
    fetchedAt: Date.now(),
  };
  memory.set(cacheKey, entry);
  const store = readStore();
  store[cacheKey] = entry;
  writeStore(store);
}

export async function loadActivePositionPnl(
  trades: ActivePositionPnlInput[],
  currency: CurrencyCode
): Promise<CachedActivePositionPnl> {
  const cacheKey = activePositionPnlCacheKey(trades, currency);
  const cached = readActivePositionPnlCache(cacheKey);
  if (cached) return cached;

  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const res = await fetch("/api/market-data/active-position-pnl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trades, currency }),
    });
    const data = (await res.json()) as {
      error?: string;
      daily?: DailyPnlPoint[];
      priorSessionBarByTradeId?: Record<string, boolean>;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "Could not load active position P&L");
    }

    const payload = {
      daily: Array.isArray(data.daily) ? data.daily : [],
      priorSessionBarByTradeId: data.priorSessionBarByTradeId ?? {},
    };
    writeActivePositionPnlCache(cacheKey, payload);
    return memory.get(cacheKey)!;
  })();

  inflight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (inflight.get(cacheKey) === request) inflight.delete(cacheKey);
  }
}
