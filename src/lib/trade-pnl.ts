import type { JournalDirection, JournalTrade } from "@/lib/journal-types";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/settings";

export type QuoteForPnl = {
  price: number | null;
  currency?: CurrencyCode;
};

function isRiskSideStop(
  direction: JournalDirection,
  entryPrice: number,
  stopLoss: number
): boolean {
  return direction === "Short"
    ? stopLoss > entryPrice
    : stopLoss < entryPrice;
}

function isRewardSideTarget(
  direction: JournalDirection,
  entryPrice: number,
  profitTarget: number
): boolean {
  return direction === "Short"
    ? profitTarget < entryPrice
    : profitTarget > entryPrice;
}

export function plannedMaxProfitLoss(trade: JournalTrade): {
  maxProfit: number | null;
  /** Signed P&L if price hits stop: negative = loss, positive = locked profit. */
  maxLoss: number | null;
} {
  const { entryPrice, stopLoss, profitTarget, quantity, direction } = trade;
  if (!quantity || !entryPrice) {
    return { maxProfit: null, maxLoss: null };
  }

  let maxProfit: number | null = null;
  let maxLoss: number | null = null;

  if (
    profitTarget > 0 &&
    Math.abs(profitTarget - entryPrice) / entryPrice > 0.000_01 &&
    isRewardSideTarget(direction, entryPrice, profitTarget)
  ) {
    maxProfit =
      Math.round(Math.abs(profitTarget - entryPrice) * quantity * 100) / 100;
  }
  if (
    stopLoss > 0 &&
    Math.abs(entryPrice - stopLoss) / entryPrice > 0.000_01
  ) {
    const stopPnl =
      direction === "Long"
        ? (stopLoss - entryPrice) * quantity
        : (entryPrice - stopLoss) * quantity;
    maxLoss = Math.round(stopPnl * 100) / 100;
  }

  return { maxProfit, maxLoss };
}

/** Planned risk:reward from entry, profit target, and stop loss (e.g. `1:2.5`). */
export function formatTradeRiskReward(trade: JournalTrade): string | null {
  const { entryPrice, stopLoss, profitTarget } = trade;
  if (!entryPrice || entryPrice <= 0) return null;

  const hasTarget =
    profitTarget > 0 &&
    Math.abs(profitTarget - entryPrice) / entryPrice > 0.000_01 &&
    isRewardSideTarget(trade.direction, entryPrice, profitTarget);
  const hasStop =
    stopLoss > 0 &&
    Math.abs(entryPrice - stopLoss) / entryPrice > 0.000_01 &&
    isRiskSideStop(trade.direction, entryPrice, stopLoss);
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
    maxLoss,
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

export type OpenPositionsNetPnlSummary = {
  totalPnl: number;
  totalRoi: number | null;
  activeCount: number;
  pricedCount: number;
};

export type OpenPositionsLiveSummaries = {
  netPnl: OpenPositionsNetPnlSummary;
  planned: OpenPositionsPlannedProfitLossSummary;
};

function computeOpenPositionsLiveSummariesInternal(
  trades: JournalTrade[],
  getQuote: (trade: JournalTrade) => QuoteForPnl | null,
  defaultCurrency: CurrencyCode,
  includeLiveQuotes: boolean
): OpenPositionsLiveSummaries {
  let totalPnl = 0;
  let totalInvested = 0;
  let activeCount = 0;
  let pricedCount = 0;
  let totalPlannedProfit = 0;
  let totalPlannedLoss = 0;
  let accumulatedReward = 0;
  let accumulatedRisk = 0;

  for (const trade of trades) {
    if ((trade.status ?? "Closed") !== "Active") continue;
    activeCount += 1;

    const { maxProfit, maxLoss } = plannedMaxProfitLoss(trade);
    if (maxProfit != null) totalPlannedProfit += maxProfit;
    if (maxLoss != null) totalPlannedLoss += maxLoss;

    const invested = trade.entryPrice * trade.quantity;
    if (invested > 0) totalInvested += invested;

    if (!includeLiveQuotes) continue;

    const display = resolveTradePnlDisplay(
      trade,
      getQuote(trade),
      defaultCurrency
    );
    totalPnl += display.pnl;
    if (!display.isUnrealized) continue;
    pricedCount += 1;
    if (display.pnl > 0) {
      accumulatedReward += display.pnl;
    } else if (display.pnl < 0) {
      accumulatedRisk += display.pnl;
    }
  }

  const roundedPnl = Math.round(totalPnl * 100) / 100;

  return {
    netPnl: {
      totalPnl: roundedPnl,
      totalRoi:
        totalInvested > 0
          ? Math.round((roundedPnl / totalInvested) * 10000) / 100
          : null,
      activeCount,
      pricedCount,
    },
    planned: {
      totalPlannedProfit: Math.round(totalPlannedProfit * 100) / 100,
      totalPlannedLoss: Math.round(totalPlannedLoss * 100) / 100,
      accumulatedReward: Math.round(accumulatedReward * 100) / 100,
      accumulatedRisk: Math.round(accumulatedRisk * 100) / 100,
      pricedCount,
      activeCount,
    },
  };
}

/** One pass over active trades for open net P&L and reward/risk summaries. */
export function computeOpenPositionsLiveSummaries(
  trades: JournalTrade[],
  getQuote: (trade: JournalTrade) => QuoteForPnl | null,
  defaultCurrency: CurrencyCode = DEFAULT_CURRENCY
): OpenPositionsLiveSummaries {
  return computeOpenPositionsLiveSummariesInternal(
    trades,
    getQuote,
    defaultCurrency,
    true
  );
}

/** Sum of Net P&L column values for open positions (matches journal table rows). */
export function computeOpenPositionsNetPnl(
  trades: JournalTrade[],
  getQuote: (trade: JournalTrade) => QuoteForPnl | null,
  defaultCurrency: CurrencyCode
): OpenPositionsNetPnlSummary {
  return computeOpenPositionsLiveSummariesInternal(
    trades,
    getQuote,
    defaultCurrency,
    true
  ).netPnl;
}

/** Entry notional as a share of total capital deployed in open positions. */
export function computePositionPortfolioPct(
  trade: JournalTrade,
  totalInvested: number
): number | null {
  if (totalInvested <= 0 || !trade.quantity || !trade.entryPrice) return null;
  const notional = Math.abs(trade.quantity * trade.entryPrice);
  return Math.round((notional / totalInvested) * 10000) / 100;
}

/**
 * Portfolio weights for active trades only. Values are rounded to 1 decimal
 * and adjusted (largest remainder) so they always sum to exactly 100.0.
 */
export function computeActivePortfolioWeights(
  trades: JournalTrade[]
): Map<string, number> {
  const active = trades.filter((t) => (t.status ?? "Closed") === "Active");
  const rows = active
    .map((t) => ({
      id: t.id,
      notional: Math.abs(t.entryPrice * t.quantity),
    }))
    .filter((r) => r.notional > 0);

  const total = rows.reduce((sum, r) => sum + r.notional, 0);
  if (total <= 0) return new Map();

  const exact = rows.map((r) => ({
    id: r.id,
    value: (r.notional / total) * 100,
  }));

  const floored = exact.map((r) => {
    const tenths = Math.floor(r.value * 10);
    return {
      id: r.id,
      tenths,
      remainder: r.value * 10 - tenths,
    };
  });

  let allocated = floored.reduce((sum, r) => sum + r.tenths, 0);
  let remaining = 1000 - allocated; // 100.0% in tenths

  floored
    .slice()
    .sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id))
    .forEach((row) => {
      if (remaining <= 0) return;
      row.tenths += 1;
      remaining -= 1;
    });

  return new Map(floored.map((r) => [r.id, r.tenths / 10]));
}

export type OpenPositionsPlannedProfitLossSummary = {
  totalPlannedProfit: number;
  /** Signed sum of P&L if each open position hits its stop. */
  totalPlannedLoss: number;
  /** Live unrealized gains so far (sum of positive open P&L with quotes). */
  accumulatedReward: number;
  /** Live unrealized losses so far (sum of negative open P&L with quotes). */
  accumulatedRisk: number;
  /** Open positions that contributed a live quote to the accumulated totals. */
  pricedCount: number;
  activeCount: number;
};

/**
 * Planned reward/risk at target/stop for open positions, plus live
 * accumulation so far (unrealized gains vs losses from current quotes).
 */
export function computeOpenPositionsPlannedProfitLoss(
  trades: JournalTrade[],
  getQuote?: (trade: JournalTrade) => QuoteForPnl | null,
  defaultCurrency: CurrencyCode = DEFAULT_CURRENCY
): OpenPositionsPlannedProfitLossSummary {
  if (!getQuote) {
    return computeOpenPositionsLiveSummariesInternal(
      trades,
      () => null,
      defaultCurrency,
      false
    ).planned;
  }

  return computeOpenPositionsLiveSummariesInternal(
    trades,
    getQuote,
    defaultCurrency,
    true
  ).planned;
}
