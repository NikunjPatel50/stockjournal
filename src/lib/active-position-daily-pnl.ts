import { format, parseISO } from "date-fns";
import {
  defaultListingMarketForCurrency,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import type { DailyPnlPoint } from "@/lib/analytics";
import type { AssetClass, JournalDirection, JournalTrade } from "@/lib/journal-types";
import {
  isExchangeSessionClosedForDate,
  isExchangeSessionPendingForToday,
  todayYmdForListingMarket,
} from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";
import type { OhlcvBar } from "@/lib/trade-pulse/types";

export type ActivePositionPnlInput = {
  id: string;
  ticker: string;
  direction: JournalDirection;
  quantity: number;
  entryPrice: number;
  entryDate: string;
  assetClass: AssetClass;
  listingMarket?: ListingMarketId;
};

function entryDayKey(entryDate: string): string {
  const trimmed = entryDate.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return format(parseISO(trimmed), "yyyy-MM-dd");
}

function resolveListingMarket(
  trade: ActivePositionPnlInput,
  currency: CurrencyCode
): ListingMarketId {
  return trade.listingMarket ?? defaultListingMarketForCurrency(currency);
}

function dailyPnlForTrade(
  trade: ActivePositionPnlInput,
  bars: OhlcvBar[],
  listingMarket: ListingMarketId,
  asOf = new Date()
): Map<string, number> {
  const entryDay = entryDayKey(trade.entryDate);
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const result = new Map<string, number>();

  for (let index = 0; index < sorted.length; index += 1) {
    const bar = sorted[index];
    if (bar.date < entryDay) continue;
    if (!isExchangeSessionClosedForDate(listingMarket, bar.date, asOf)) {
      continue;
    }

    let reference = trade.entryPrice;
    if (bar.date !== entryDay) {
      const previous = sorted[index - 1];
      if (previous && previous.date >= entryDay) {
        reference = previous.close;
      }
    }

    const move =
      trade.direction === "Long"
        ? trade.quantity * (bar.close - reference)
        : trade.quantity * (reference - bar.close);

    result.set(bar.date, Math.round(move * 100) / 100);
  }

  return result;
}

export function toActivePositionPnlInput(
  trade: JournalTrade
): ActivePositionPnlInput | null {
  if ((trade.status ?? "Closed") !== "Active") return null;
  if (!trade.quantity || !trade.entryPrice) return null;

  return {
    id: trade.id,
    ticker: trade.ticker,
    direction: trade.direction,
    quantity: trade.quantity,
    entryPrice: trade.entryPrice,
    entryDate: trade.entryDate,
    assetClass: trade.assetClass,
    listingMarket: trade.listingMarket,
  };
}

export function computeActivePositionDailyPnl(
  trades: ActivePositionPnlInput[],
  barsByTradeId: Record<string, OhlcvBar[]>,
  options: { asOf?: Date; currency?: CurrencyCode } = {}
): DailyPnlPoint[] {
  const asOf = options.asOf ?? new Date();
  const currency = options.currency ?? "USD";
  const totals = new Map<string, { pnl: number; positions: number }>();

  for (const trade of trades) {
    if (trade.assetClass !== "Equities") continue;

    const bars = barsByTradeId[trade.id] ?? [];
    if (bars.length === 0) continue;

    const listingMarket = resolveListingMarket(trade, currency);
    const tradeDaily = dailyPnlForTrade(trade, bars, listingMarket, asOf);
    for (const [date, pnl] of tradeDaily) {
      const current = totals.get(date) ?? { pnl: 0, positions: 0 };
      current.pnl = Math.round((current.pnl + pnl) * 100) / 100;
      current.positions += 1;
      totals.set(date, current);
    }
  }

  return Array.from(totals.entries())
    .map(([date, value]) => ({
      date,
      pnl: value.pnl,
      trades: value.positions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function isActivePositionTodayPnlPending(
  trades: ActivePositionPnlInput[],
  currency: CurrencyCode,
  now = new Date()
): boolean {
  for (const trade of trades) {
    if (trade.assetClass !== "Equities") continue;
    const listingMarket = resolveListingMarket(trade, currency);
    if (isExchangeSessionPendingForToday(listingMarket, now)) {
      return true;
    }
  }
  return false;
}

export function activePositionTodayPnl(
  daily: DailyPnlPoint[],
  trades: ActivePositionPnlInput[],
  currency: CurrencyCode,
  now = new Date()
): number | null {
  const todayDates = new Set<string>();
  for (const trade of trades) {
    if (trade.assetClass !== "Equities") continue;
    const listingMarket = resolveListingMarket(trade, currency);
    todayDates.add(todayYmdForListingMarket(listingMarket, now));
  }

  const points = daily.filter((point) => todayDates.has(point.date));
  if (points.length === 0) return null;

  return (
    Math.round(points.reduce((sum, point) => sum + point.pnl, 0) * 100) / 100
  );
}
