import type { JournalTrade } from "@/lib/journal-types";

/** True when live price has reached or crossed the trade's stop loss (display only). */
export function isStopLossHit(
  trade: JournalTrade,
  marketPrice: number
): boolean {
  if ((trade.status ?? "Closed") !== "Active") return false;
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) return false;

  const { entryPrice, stopLoss } = trade;
  if (
    stopLoss <= 0 ||
    entryPrice <= 0 ||
    Math.abs(entryPrice - stopLoss) / entryPrice <= 0.000_01
  ) {
    return false;
  }

  if (trade.direction === "Short") {
    return marketPrice >= stopLoss;
  }
  return marketPrice <= stopLoss;
}

/** Clear exit fields when a trade should be active again. */
export function reopenActiveTrade(trade: JournalTrade): JournalTrade {
  return {
    ...trade,
    status: "Active",
    exitPrice: 0,
    exitDate: trade.entryDate,
    pnl: 0,
    roi: 0,
    realizedRisk: 0,
    holdTimeHours: 0,
  };
}
