import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";

export type QuoteForPnl = {
  price: number | null;
  currency?: CurrencyCode;
};

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
