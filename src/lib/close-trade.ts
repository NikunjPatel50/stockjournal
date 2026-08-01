import type { JournalTrade } from "@/lib/journal-types";

function hasValidStopLoss(trade: JournalTrade): boolean {
  const { entryPrice, stopLoss } = trade;
  return (
    stopLoss > 0 &&
    entryPrice > 0 &&
    Math.abs(entryPrice - stopLoss) / entryPrice > 0.000_01
  );
}

/** True when live price has reached or crossed the trade's stop loss. */
export function isStopLossHit(
  trade: JournalTrade,
  marketPrice: number
): boolean {
  if ((trade.status ?? "Closed") !== "Active") return false;
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) return false;
  if (!hasValidStopLoss(trade)) return false;

  const { stopLoss } = trade;
  if (trade.direction === "Short") {
    return marketPrice >= stopLoss;
  }
  return marketPrice <= stopLoss;
}

function deriveOutcome(pnl: number): JournalTrade["outcome"] {
  if (Math.abs(pnl) < 1) return "Breakeven";
  return pnl > 0 ? "Win" : "Loss";
}

/** Close an active trade at the stop loss price (or override exit price). */
export function closeTradeAtStopLoss(
  trade: JournalTrade,
  exitPrice: number = trade.stopLoss
): JournalTrade {
  const fees = trade.fees ?? 0;
  const gross =
    trade.direction === "Long"
      ? (exitPrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - exitPrice) * trade.quantity;
  const pnl = Math.round((gross - fees) * 100) / 100;
  const notional = trade.entryPrice * trade.quantity;
  const roi = notional ? Math.round((pnl / notional) * 10000) / 100 : 0;
  const exitDate = new Date().toISOString();
  const holdMs = Date.now() - new Date(trade.entryDate).getTime();
  const holdTimeHours = Math.round((holdMs / (1000 * 60 * 60)) * 100) / 100;

  return {
    ...trade,
    status: "Closed",
    exitPrice,
    exitDate,
    pnl,
    roi,
    holdTimeHours,
    outcome: deriveOutcome(pnl),
    realizedRisk: pnl < 0 ? Math.abs(pnl) : 0,
  };
}

export function applyStopLossClosures(
  trades: JournalTrade[],
  getQuote: (trade: JournalTrade) => { price: number | null } | null
): { nextTrades: JournalTrade[]; closed: JournalTrade[] } {
  const closed: JournalTrade[] = [];
  let changed = false;

  const nextTrades = trades.map((trade) => {
    const price = getQuote(trade)?.price;
    if (price == null || !isStopLossHit(trade, price)) {
      return trade;
    }
    const closedTrade = closeTradeAtStopLoss(trade);
    closed.push(closedTrade);
    changed = true;
    return closedTrade;
  });

  return {
    nextTrades: changed ? nextTrades : trades,
    closed,
  };
}
