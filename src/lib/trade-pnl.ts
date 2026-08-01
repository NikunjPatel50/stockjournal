import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";

export type QuoteForPnl = {
  price: number | null;
  currency?: CurrencyCode;
};

export function plannedMaxProfitLoss(trade: JournalTrade): {
  maxProfit: number | null;
  maxLoss: number | null;
} {
  const { entryPrice, stopLoss, profitTarget, quantity } = trade;
  if (!quantity || !entryPrice) {
    return { maxProfit: null, maxLoss: null };
  }

  let maxProfit: number | null = null;
  let maxLoss: number | null = null;

  if (
    profitTarget > 0 &&
    Math.abs(profitTarget - entryPrice) / entryPrice > 0.000_01
  ) {
    maxProfit =
      Math.round(Math.abs(profitTarget - entryPrice) * quantity * 100) / 100;
  }
  if (stopLoss > 0 && Math.abs(entryPrice - stopLoss) / entryPrice > 0.000_01) {
    maxLoss =
      Math.round(Math.abs(entryPrice - stopLoss) * quantity * 100) / 100;
  }

  return { maxProfit, maxLoss };
}

/** Planned risk:reward from entry, profit target, and stop loss (e.g. `1:2.5`). */
export function formatTradeRiskReward(trade: JournalTrade): string | null {
  const { entryPrice, stopLoss, profitTarget } = trade;
  if (!entryPrice || entryPrice <= 0) return null;

  const hasTarget =
    profitTarget > 0 &&
    Math.abs(profitTarget - entryPrice) / entryPrice > 0.000_01;
  const hasStop =
    stopLoss > 0 && Math.abs(entryPrice - stopLoss) / entryPrice > 0.000_01;
  if (!hasTarget || !hasStop) return null;

  const plannedRisk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(profitTarget - entryPrice);
  if (plannedRisk <= 0) return null;

  return `1:${(reward / plannedRisk).toFixed(1)}`;
}

export function unrealizedPnlFromMarket(
  trade: JournalTrade,
  marketPrice: number
): { pnl: number; roi: number } {
  const gross =
    trade.direction === "Short"
      ? (trade.entryPrice - marketPrice) * trade.quantity
      : (marketPrice - trade.entryPrice) * trade.quantity;
  const fees = trade.fees ?? 0;
  const pnl = Math.round((gross - fees) * 100) / 100;
  const notional = trade.entryPrice * trade.quantity;
  const roi =
    notional > 0 ? Math.round((pnl / notional) * 10000) / 100 : 0;
  return { pnl, roi };
}

export type TradePnlDisplay = {
  pnl: number;
  roi: number;
  isUnrealized: boolean;
  currency: CurrencyCode;
};

export type MaxProfitLossDisplay = {
  maxProfit: number | null;
  maxLoss: number | null;
  currency: CurrencyCode;
};

export function resolveMaxProfitLossDisplay(
  trade: JournalTrade,
  _quote: QuoteForPnl | null,
  defaultCurrency: CurrencyCode
): MaxProfitLossDisplay {
  const { maxProfit, maxLoss } = plannedMaxProfitLoss(trade);
  return {
    maxProfit,
    maxLoss: maxLoss != null ? -maxLoss : null,
    currency: defaultCurrency,
  };
}

export function resolveTradePnlDisplay(
  trade: JournalTrade,
  quote: QuoteForPnl | null,
  defaultCurrency: CurrencyCode
): TradePnlDisplay {
  const isActive = (trade.status ?? "Closed") === "Active";
  if (isActive && quote?.price != null && quote.price > 0) {
    const { pnl, roi } = unrealizedPnlFromMarket(trade, quote.price);
    return {
      pnl,
      roi,
      isUnrealized: true,
      currency: quote.currency ?? defaultCurrency,
    };
  }
  return {
    pnl: trade.pnl,
    roi: trade.roi,
    isUnrealized: false,
    currency: defaultCurrency,
  };
}

export type LiveActivePnlSummary = {
  totalPnl: number;
  activeCount: number;
  pricedCount: number;
};

/** Sum unrealized P&L for open positions using live/delayed quotes when available. */
export function computeLiveActivePnl(
  activeTrades: JournalTrade[],
  getQuote: (trade: JournalTrade) => QuoteForPnl | null,
  defaultCurrency: CurrencyCode
): LiveActivePnlSummary {
  let totalPnl = 0;
  let pricedCount = 0;

  for (const trade of activeTrades) {
    const quote = getQuote(trade);
    const display = resolveTradePnlDisplay(trade, quote, defaultCurrency);
    if (display.isUnrealized) {
      totalPnl += display.pnl;
      pricedCount += 1;
    }
  }

  return {
    totalPnl: Math.round(totalPnl * 100) / 100,
    activeCount: activeTrades.length,
    pricedCount,
  };
}

export type FilteredPnlSummary = {
  totalPnl: number;
  activeCount: number;
  pricedActiveCount: number;
};

/** Realized P&L for closed trades plus live unrealized P&L for active trades in the filter. */
export function computeFilteredPnl(
  trades: JournalTrade[],
  getQuote: (trade: JournalTrade) => QuoteForPnl | null,
  defaultCurrency: CurrencyCode
): FilteredPnlSummary {
  let totalPnl = 0;
  let activeCount = 0;
  let pricedActiveCount = 0;

  for (const trade of trades) {
    const isActive = (trade.status ?? "Closed") === "Active";
    const display = resolveTradePnlDisplay(
      trade,
      getQuote(trade),
      defaultCurrency
    );
    totalPnl += display.pnl;
    if (isActive) {
      activeCount += 1;
      if (display.isUnrealized) pricedActiveCount += 1;
    }
  }

  return {
    totalPnl: Math.round(totalPnl * 100) / 100,
    activeCount,
    pricedActiveCount,
  };
}
