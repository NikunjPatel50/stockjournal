export const JOURNAL_TABLE_STORAGE_KEY = "tradetracker_journal_columns_v2";

export const JOURNAL_LOCKED_END = ["actions"] as const;

export const JOURNAL_REORDERABLE_COLUMNS = [
  { id: "entryDate", label: "Date" },
  { id: "ticker", label: "Ticker" },
  { id: "status", label: "Status" },
  { id: "outcome", label: "Outcome" },
  { id: "prices", label: "Entry/exit" },
  { id: "currentPrice", label: "Market price" },
  { id: "quantity", label: "Qty" },
  { id: "pnl", label: "Net P&L" },
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

function sanitizeOrder(order: string[]): string[] {
  const allowed = new Set<string>(DEFAULT_JOURNAL_COLUMN_ORDER);
  const middle = order.filter((id) => allowed.has(id) && id !== "actions");
  const missing = JOURNAL_REORDERABLE_COLUMNS.map((c) => c.id).filter(
    (id) => !middle.includes(id)
  );
  return [...middle, ...missing, ...JOURNAL_LOCKED_END];
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
