export const JOURNAL_TABLE_STORAGE_KEY = "tradetracker_journal_columns_v2";

export const JOURNAL_LOCKED_END = ["actions"] as const;

/** Shown in the per-row accordion instead of the main table row. */
export const JOURNAL_ACCORDION_COLUMN_IDS = [
  "status",
  "outcome",
  "targetStop",
  "profitTargetStopLoss",
] as const;

const ACCORDION_COLUMN_SET = new Set<string>(JOURNAL_ACCORDION_COLUMN_IDS);

export const JOURNAL_REORDERABLE_COLUMNS = [
  { id: "entryDate", label: "Date" },
  { id: "ticker", label: "Ticker" },
  { id: "prices", label: "Entry / Exit" },
  { id: "currentPrice", label: "Market price" },
  { id: "quantity", label: "Qty" },
  { id: "invested", label: "Invested" },
  { id: "pnl", label: "Net P&L" },
  { id: "dailyPnl", label: "Daily P/L" },
  { id: "riskReward", label: "R:R" },
  { id: "targetStopProgress", label: "Target / Stop" },
  { id: "holdTimeHours", label: "Hold" },
] as const;

export type JournalReorderableColumnId =
  (typeof JOURNAL_REORDERABLE_COLUMNS)[number]["id"];

export const DEFAULT_JOURNAL_COLUMN_ORDER = [
  ...JOURNAL_REORDERABLE_COLUMNS.map((c) => c.id),
  ...JOURNAL_LOCKED_END,
];

export type JournalColumnPrefs = {
  order: string[];
  visibility: Record<string, boolean>;
};

function defaultVisibility(): Record<string, boolean> {
  const vis: Record<string, boolean> = { actions: true };
  for (const col of JOURNAL_REORDERABLE_COLUMNS) {
    vis[col.id] = true;
  }
  return vis;
}

export function defaultJournalColumnPrefs(): JournalColumnPrefs {
  return {
    order: [...DEFAULT_JOURNAL_COLUMN_ORDER],
    visibility: defaultVisibility(),
  };
}

function migrateLegacyColumnOrder(order: string[]): string[] {
  const hasLegacy =
    order.includes("maxProfit") || order.includes("maxLoss");
  if (!hasLegacy) return order;

  const withoutLegacy = order.filter(
    (id) => id !== "maxProfit" && id !== "maxLoss"
  );
  if (withoutLegacy.includes("targetStop")) return withoutLegacy;

  const profitIdx = order.indexOf("maxProfit");
  const lossIdx = order.indexOf("maxLoss");
  const insertAt =
    profitIdx !== -1
      ? profitIdx
      : lossIdx !== -1
        ? lossIdx
        : withoutLegacy.length;
  const next = [...withoutLegacy];
  next.splice(insertAt, 0, "targetStop");
  return next;
}

function migrateDailyPnlColumn(order: string[]): string[] {
  if (order.includes("dailyPnl")) return order;
  const pnlIdx = order.indexOf("pnl");
  if (pnlIdx === -1) return order;
  const next = [...order];
  next.splice(pnlIdx + 1, 0, "dailyPnl");
  return next;
}

function sanitizeOrder(order: string[]): string[] {
  const migrated = migrateDailyPnlColumn(migrateLegacyColumnOrder(order));
  const actionsIdx = migrated.indexOf("actions");
  const beforeActions =
    actionsIdx === -1 ? migrated : migrated.slice(0, actionsIdx);
  const afterActions =
    actionsIdx === -1 ? [] : migrated.slice(actionsIdx + 1);

  const allowed = new Set<string>(DEFAULT_JOURNAL_COLUMN_ORDER);
  const middle = beforeActions.filter(
    (id) => allowed.has(id) && id !== "actions" && !ACCORDION_COLUMN_SET.has(id)
  );
  const trailing = afterActions.filter(
    (id) => allowed.has(id) && id !== "actions" && !ACCORDION_COLUMN_SET.has(id)
  );
  const missing = JOURNAL_REORDERABLE_COLUMNS.map((c) => c.id).filter(
    (id) => !middle.includes(id) && !trailing.includes(id)
  );
  return [...middle, ...trailing, ...missing, ...JOURNAL_LOCKED_END];
}

/** Keep Actions last; fill in any new column ids before it. */
export function sanitizeJournalColumnOrder(order: string[]): string[] {
  return sanitizeOrder(order);
}

export function loadJournalColumnPrefs(): JournalColumnPrefs {
  if (typeof window === "undefined") return defaultJournalColumnPrefs();
  try {
    const raw = localStorage.getItem(JOURNAL_TABLE_STORAGE_KEY);
    if (!raw) return defaultJournalColumnPrefs();
    const parsed = JSON.parse(raw) as JournalColumnPrefs;
    const base = defaultJournalColumnPrefs();
    const vis: Record<string, boolean> = {
      ...base.visibility,
      ...(parsed.visibility ?? {}),
    };
    delete vis.select;
    delete vis.maxProfit;
    delete vis.maxLoss;
    if (vis.targetStop === undefined) {
      const legacyVisible =
        parsed.visibility?.maxProfit !== false ||
        parsed.visibility?.maxLoss !== false;
      vis.targetStop = legacyVisible;
    }
    if (vis.dailyPnl === undefined) {
      vis.dailyPnl = true;
    }
    return {
      order: sanitizeOrder(parsed.order ?? base.order),
      visibility: { ...vis, actions: true },
    };
  } catch {
    return defaultJournalColumnPrefs();
  }
}

export function saveJournalColumnPrefs(prefs: JournalColumnPrefs) {
  if (typeof window === "undefined") return;
  const visibility: Record<string, boolean> = {
    ...prefs.visibility,
    actions: true,
  };
  delete visibility.select;
  localStorage.setItem(
    JOURNAL_TABLE_STORAGE_KEY,
    JSON.stringify({
      order: sanitizeOrder(prefs.order),
      visibility,
    })
  );
}

export function moveJournalColumn(
  order: string[],
  columnId: string,
  direction: "up" | "down"
): string[] {
  const middle = order.filter((id) => id !== "actions");
  const idx = middle.indexOf(columnId);
  if (idx === -1) return order;
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= middle.length) return order;
  const next = [...middle];
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return [...next, ...JOURNAL_LOCKED_END];
}
