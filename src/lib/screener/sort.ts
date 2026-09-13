import type { PeriodChanges, ScreenerPeriod } from "@/lib/screener/types";

export type SortDirection = "asc" | "desc";

export type ScreenerSortKey = ScreenerPeriod | "strength";

export type ScreenerSort = {
  key: ScreenerSortKey;
  period: ScreenerPeriod;
  direction: SortDirection;
};

export function defaultScreenerSort(
  period: ScreenerPeriod = "1m"
): ScreenerSort {
  return { key: period, period, direction: "desc" };
}

export function toggleScreenerSort(
  current: ScreenerSort,
  key: ScreenerSortKey
): ScreenerSort {
  if (current.key === key) {
    return {
      ...current,
      direction: current.direction === "desc" ? "asc" : "desc",
    };
  }

  return {
    key,
    period: key === "strength" ? current.period : key,
    direction: "desc",
  };
}

export function comparePeriodChange(
  left: PeriodChanges,
  right: PeriodChanges,
  sort: ScreenerSort,
  fallback = 0
): number {
  if (sort.key === "strength") return fallback;
  const a = left[sort.key];
  const b = right[sort.key];
  if (a == null && b == null) return fallback;
  if (a == null) return 1;
  if (b == null) return -1;
  return sort.direction === "desc" ? b - a : a - b;
}

export function compareScreenerStrength(
  left: number | null | undefined,
  right: number | null | undefined,
  direction: SortDirection,
  fallback = 0
): number {
  if (left == null && right == null) return fallback;
  if (left == null) return 1;
  if (right == null) return -1;
  return direction === "desc" ? right - left : left - right;
}

export function compareScreenerRows(
  left: { changes: PeriodChanges; strength: number | null },
  right: { changes: PeriodChanges; strength: number | null },
  sort: ScreenerSort,
  fallback = 0
): number {
  if (sort.key === "strength") {
    return compareScreenerStrength(left.strength, right.strength, sort.direction, fallback);
  }
  return comparePeriodChange(left.changes, right.changes, sort, fallback);
}
