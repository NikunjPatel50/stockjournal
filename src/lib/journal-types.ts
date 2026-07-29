import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import type { CurrencyCode } from "@/lib/settings";

export type AssetClass = "Equities" | "Options" | "Crypto" | "Forex";
export type JournalDirection = "Long" | "Short";
export type JournalOutcome = "Win" | "Loss" | "Breakeven";
export type JournalTradeStatus = "Closed" | "Active";

export interface ExecutionFill {
  id: string;
  time: string;
  side: "Entry" | "Exit" | "Scale In" | "Scale Out";
  price: number;
  quantity: number;
  fees: number;
}

export interface JournalTrade {
  id: string;
  ticker: string;
  assetClass: AssetClass;
  direction: JournalDirection;
  status: JournalTradeStatus;
  outcome: JournalOutcome;
  strategy: string;
  tags: string[];
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  fees: number;
  stopLoss: number;
  profitTarget: number;
  pnl: number;
  roi: number;
  holdTimeHours: number;
  riskReward: string;
  plannedRisk: number;
  realizedRisk: number;
  mindset: number;
  notes: string;
  psychology: string[];
  executions: ExecutionFill[];
  screenshots: string[];
  /** Exchange used for live quotes (equities). */
  listingMarket?: ListingMarketId;
}

export interface JournalFilters {
  search: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  assetClass: string;
  direction: string;
  outcome: string;
  status: string;
  strategy: string;
}

export const STRATEGY_OPTIONS = [
  "Breakout",
  "Reversal",
  "Bull Put Spread",
  "Iron Condor",
  "Momentum",
  "Range Trade",
  "Earnings Play",
  "50 EMA Touch",
] as const;

export const TAG_OPTIONS = [
  "50 EMA Touch",
  "Earnings Play",
  "Followed Plan",
  "FOMO",
  "Chased Entry",
  "High Conviction",
  "News Catalyst",
  "Technical Only",
] as const;

export const ASSET_CLASS_OPTIONS = [
  "Equities",
  "Options",
  "Crypto",
  "Forex",
] as const;

function normalizeAssetClass(value: unknown): AssetClass {
  if (
    value === "Equities" ||
    value === "Options" ||
    value === "Crypto" ||
    value === "Forex"
  ) {
    return value;
  }
  return "Equities";
}

export function normalizeJournalTrade(
  trade: JournalTrade,
  defaultCurrency: CurrencyCode = "USD"
): JournalTrade {
  const status = trade.status === "Active" ? "Active" : "Closed";
  return {
    ...trade,
    ticker: String(trade.ticker ?? "").trim(),
    assetClass: normalizeAssetClass(trade.assetClass),
    listingMarket:
      trade.listingMarket != null
        ? normalizeListingMarket(trade.listingMarket)
        : defaultListingMarketForCurrency(defaultCurrency),
    status,
    exitPrice: status === "Active" ? 0 : trade.exitPrice,
  };
}

export function isClosedTrade(trade: JournalTrade): boolean {
  return (trade.status ?? "Closed") === "Closed";
}

/** Outcome label in UI — active trades are not finalized yet. */
export function displayTradeOutcome(trade: JournalTrade): string {
  if ((trade.status ?? "Closed") === "Active") return "—";
  return trade.outcome;
}

export function emptyFilters(): JournalFilters {
  return {
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    assetClass: "all",
    direction: "all",
    outcome: "all",
    status: "all",
    strategy: "all",
  };
}

export function filterJournalTrades(
  trades: JournalTrade[],
  filters: JournalFilters
): JournalTrade[] {
  return trades.filter((trade) => {
    const q = filters.search.trim().toLowerCase();
    if (q) {
      const haystack = [
        trade.ticker,
        trade.strategy,
        trade.notes,
        ...trade.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.assetClass !== "all" && trade.assetClass !== filters.assetClass) {
      return false;
    }
    if (filters.direction !== "all" && trade.direction !== filters.direction) {
      return false;
    }
    if (filters.outcome !== "all" && trade.outcome !== filters.outcome) {
      return false;
    }
    if (filters.status !== "all") {
      const tradeStatus = trade.status === "Active" ? "Active" : "Closed";
      if (tradeStatus !== filters.status) return false;
    }
    if (filters.strategy !== "all" && trade.strategy !== filters.strategy) {
      return false;
    }

    const entry = new Date(trade.entryDate);
    if (filters.dateFrom && entry < filters.dateFrom) return false;
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      if (entry > end) return false;
    }

    return true;
  });
}

export function computeJournalSummary(trades: JournalTrade[]) {
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter((t) => t.outcome === "Win").length;
  const losses = trades.filter((t) => t.outcome === "Loss");
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  const grossProfit = trades
    .filter((t) => t.pnl > 0)
    .reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(
    losses.reduce((sum, t) => sum + t.pnl, 0)
  );
  const profitFactor =
    grossLoss === 0
      ? grossProfit > 0
        ? Infinity
        : 0
      : grossProfit / grossLoss;

  const avgHold =
    trades.length === 0
      ? 0
      : trades.reduce((sum, t) => sum + t.holdTimeHours, 0) / trades.length;

  const totalVolume = trades.reduce((sum, t) => sum + t.quantity, 0);
  const losingTrades = losses.length;
  const decidedTrades = wins + losingTrades;
  const accuracyPercent = decidedTrades
    ? (wins / decidedTrades) * 100
    : 0;

  return {
    totalPnl,
    winRate,
    accuracyPercent,
    profitFactor,
    avgHoldHours: avgHold,
    totalVolume,
    totalLoss: grossLoss,
    winningTrades: wins,
    losingTrades,
    count: trades.length,
  };
}

export function formatCurrency(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Display a market price with the user's currency symbol (not P&L signed format). */
export function formatMarketPrice(
  value: number,
  currency: "USD" | "EUR" | "GBP" | "INR" | "CAD" = "USD"
) {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Signed P&L with currency symbol (e.g. active / unrealized). */
export function formatSignedMoney(
  value: number,
  currency: "USD" | "EUR" | "GBP" | "INR" | "CAD" = "USD"
) {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value);
}

export function formatHoldTime(hours: number) {
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

/** Elapsed hold for open positions (entry → now). */
export function activeTradeHoldHours(
  entryDate: string,
  nowMs: number = Date.now()
): number {
  const start = new Date(entryDate).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max((nowMs - start) / (1000 * 60 * 60), 0);
}

export function resolveTradeHoldHours(
  trade: JournalTrade,
  nowMs: number = Date.now()
): number {
  if ((trade.status ?? "Closed") === "Active") {
    return activeTradeHoldHours(trade.entryDate, nowMs);
  }
  return trade.holdTimeHours;
}
