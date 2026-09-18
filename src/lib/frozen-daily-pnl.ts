import type { DailyPnlPoint } from "@/lib/analytics";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  isExchangeSessionClosedForDate,
  todayYmdForListingMarket,
} from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";
import {
  frozenDailyPnlStorageKey,
  getActiveStorageUserId,
} from "@/lib/user-storage";

type FrozenStore = Record<string, DailyPnlPoint>;

function storageKey(currency: CurrencyCode) {
  const userId = getActiveStorageUserId() ?? "guest";
  return `${frozenDailyPnlStorageKey(userId)}:${currency}`;
}

function isDailyPnlPoint(value: unknown): value is DailyPnlPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as DailyPnlPoint;
  return (
    typeof point.date === "string" &&
    typeof point.pnl === "number" &&
    Number.isFinite(point.pnl) &&
    typeof point.trades === "number"
  );
}

export function readFrozenDailyPnl(currency: CurrencyCode): FrozenStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(currency));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as FrozenStore;
    if (!parsed || typeof parsed !== "object") return {};
    const result: FrozenStore = {};
    for (const [date, point] of Object.entries(parsed)) {
      if (isDailyPnlPoint(point)) result[date] = point;
    }
    return result;
  } catch {
    return {};
  }
}

export function writeFrozenDailyPnl(
  currency: CurrencyCode,
  frozen: FrozenStore
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(currency), JSON.stringify(frozen));
  } catch {
    // Ignore quota errors.
  }
}

export function upsertDailyPnlPoint(
  daily: DailyPnlPoint[],
  point: DailyPnlPoint
): DailyPnlPoint[] {
  const index = daily.findIndex((row) => row.date === point.date);
  if (index < 0) {
    return [...daily, point].sort((left, right) =>
      left.date.localeCompare(right.date)
    );
  }
  const current = daily[index];
  if (current.pnl === point.pnl && current.trades === point.trades) {
    return daily;
  }
  const next = [...daily];
  next[index] = point;
  return next;
}

/** After the bell, seed today's point from the last live total so it can freeze. */
export function withClosedSessionLiveSnapshot(
  daily: DailyPnlPoint[],
  live: { totalPnl: number; pricedCount: number },
  listingMarket: ListingMarketId,
  asOf = new Date()
): DailyPnlPoint[] {
  const today = todayYmdForListingMarket(listingMarket, asOf);
  if (!isExchangeSessionClosedForDate(listingMarket, today, asOf)) {
    return daily;
  }
  if (live.pricedCount <= 0) return daily;
  return upsertDailyPnlPoint(daily, {
    date: today,
    pnl: live.totalPnl,
    trades: live.pricedCount,
  });
}

export function dailyPnlPointsEqual(
  left: DailyPnlPoint[],
  right: DailyPnlPoint[]
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every(
    (point, index) =>
      point.date === right[index].date &&
      point.pnl === right[index].pnl &&
      point.trades === right[index].trades
  );
}

export function mergeFrozenClosedDailyPnl(
  computed: DailyPnlPoint[],
  frozen: FrozenStore,
  isDateClosed: (date: string) => boolean
): {
  daily: DailyPnlPoint[];
  nextFrozen: FrozenStore;
  changed: boolean;
} {
  const computedByDate = new Map(computed.map((point) => [point.date, point]));
  let nextFrozen = frozen;
  let changed = false;
  const dates = new Set([...computedByDate.keys(), ...Object.keys(frozen)]);
  const daily: DailyPnlPoint[] = [];

  for (const date of [...dates].sort()) {
    const computedPoint = computedByDate.get(date);
    const locked = nextFrozen[date];
    const closed = isDateClosed(date);

    if (closed && locked) {
      daily.push(locked);
      continue;
    }

    if (closed && computedPoint) {
      if (!changed) nextFrozen = { ...frozen };
      nextFrozen[date] = computedPoint;
      changed = true;
      daily.push(computedPoint);
      continue;
    }

    if (computedPoint) daily.push(computedPoint);
  }

  if (!changed && dailyPnlPointsEqual(daily, computed)) {
    return { daily: computed, nextFrozen: frozen, changed: false };
  }

  return { daily, nextFrozen, changed };
}
