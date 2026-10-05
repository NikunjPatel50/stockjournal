export type SortDirection = "asc" | "desc";

export type ColumnSort<K extends string> = {
  key: K;
  direction: SortDirection;
};

export function toggleColumnSort<K extends string>(
  current: ColumnSort<K> | null,
  key: K,
  firstDirection: SortDirection
): ColumnSort<K> {
  if (current?.key === key) {
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }
  return { key, direction: firstDirection };
}

/** Empty values stay at the bottom in both directions. */
export function compareSortValues(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
  direction: SortDirection
): number {
  const a = left == null || left === "" ? null : left;
  const b = right == null || right === "" ? null : right;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  const result =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "en", {
          numeric: true,
          sensitivity: "base",
        });
  return direction === "asc" ? result : -result;
}
