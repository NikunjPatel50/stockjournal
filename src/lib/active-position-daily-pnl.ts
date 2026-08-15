import {
  defaultListingMarketForCurrency,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import type { DailyPnlPoint } from "@/lib/analytics";
import type { AssetClass, JournalDirection, JournalTrade } from "@/lib/journal-types";
import {
  entryDayKey,
  isEnteredOnSessionDate,
} from "@/lib/journal-entry-date";
import {
  hasExchangeSessionStartedForDate,
  isExchangeSessionClosedForDate,
  isExchangeSessionPendingForToday,
  resolveDailyPnlSessionDate,
  todayYmdForListingMarket,
} from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";
import type { OhlcvBar } from "@/lib/trade-pulse/types";

export type LiveQuoteForDailyPnl = {
  price: number;
  changePercent?: number | null;
};

export type ActivePositionPnlInput = {
  id: string;
  ticker: string;
  direction: JournalDirection;
  quantity: number;
  entryPrice: number;
  entryDate: string;
  assetClass: AssetClass;
  listingMarket?: ListingMarketId;
  fees?: number;
};

function hasPriorExchangeSessionBar(
  bars: OhlcvBar[],
  entryDay: string,
  sessionDate: string
): boolean {
  return bars.some(
    (bar) => bar.date > entryDay && bar.date < sessionDate
  );
}

function isEntrySessionDate(
  trade: ActivePositionPnlInput,
  sessionDate: string,
  listingMarket: ListingMarketId,
  hasPriorSessionBar = true
): boolean {
  if (isEnteredOnSessionDate(trade.entryDate, sessionDate, listingMarket)) {
    return true;
  }

  const entryDay = entryDayKey(trade.entryDate, listingMarket);
  if (sessionDate < entryDay) return false;
  // No completed session after entry — common for same-day entries.
  return !hasPriorSessionBar;
}

function resolveListingMarket(
  trade: ActivePositionPnlInput,
  currency: CurrencyCode
): ListingMarketId {
  return trade.listingMarket ?? defaultListingMarketForCurrency(currency);
}

function findPreviousTradingBar(
  sorted: OhlcvBar[],
  date: string,
  entryDay: string
): OhlcvBar | null {
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const bar = sorted[index];
    if (bar.date < date && bar.date >= entryDay) {
      return bar;
    }
  }
  return null;
}

function dailyMove(
  trade: ActivePositionPnlInput,
  endPrice: number,
  reference: number
): number {
  return trade.direction === "Long"
    ? trade.quantity * (endPrice - reference)
    : trade.quantity * (reference - endPrice);
}

function entryDayDailyFromQuote(
  trade: ActivePositionPnlInput,
  quote: LiveQuoteForDailyPnl
): number {
  const gross = dailyMove(trade, quote.price, trade.entryPrice);
  const fees = trade.fees ?? 0;
  return Math.round((gross - fees) * 100) / 100;
}

/** Daily P&L for a session date using a live/delayed quote (today or entry day). */
export function quoteDailyPnlForSession(
  trade: ActivePositionPnlInput,
  quote: LiveQuoteForDailyPnl,
  sessionDate: string,
  listingMarket: ListingMarketId,
  asOf = new Date(),
  options?: { hasPriorSessionBar?: boolean }
): number | null {
  // Gate on session *start* (not close) so today's P&L goes live at market
  // open and updates continuously through the day, resetting to ~0 each
  // morning instead of staying frozen until the session closes.
  if (!hasExchangeSessionStartedForDate(listingMarket, sessionDate, asOf)) {
    return null;
  }

  const entryDay = entryDayKey(trade.entryDate, listingMarket);
  if (sessionDate < entryDay) return null;

  const hasPriorSessionBar = options?.hasPriorSessionBar ?? true;
  if (
    isEntrySessionDate(trade, sessionDate, listingMarket, hasPriorSessionBar)
  ) {
    return entryDayDailyFromQuote(trade, quote);
  }

  if (quote.changePercent != null && Number.isFinite(quote.changePercent)) {
    const prevClose = quote.price / (1 + quote.changePercent / 100);
    return Math.round(dailyMove(trade, quote.price, prevClose) * 100) / 100;
  }

  return null;
}

function dailyPnlForTrade(
  trade: ActivePositionPnlInput,
  bars: OhlcvBar[],
  listingMarket: ListingMarketId,
  asOf = new Date()
): Map<string, number> {
  const entryDay = entryDayKey(trade.entryDate, listingMarket);
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const result = new Map<string, number>();

  for (const bar of sorted) {
    if (bar.date < entryDay) continue;
    if (!isExchangeSessionClosedForDate(listingMarket, bar.date, asOf)) {
      continue;
    }

    let reference = trade.entryPrice;
    if (bar.date !== entryDay) {
      const previous = findPreviousTradingBar(sorted, bar.date, entryDay);
      if (previous) {
        reference = previous.close;
      }
    }

    result.set(
      bar.date,
      Math.round(dailyMove(trade, bar.close, reference) * 100) / 100
    );
  }

  return result;
}

function applyQuoteDailyForToday(
  trade: ActivePositionPnlInput,
  tradeDaily: Map<string, number>,
  quote: LiveQuoteForDailyPnl,
  listingMarket: ListingMarketId,
  asOf: Date,
  bars: OhlcvBar[] = []
) {
  const today = todayYmdForListingMarket(listingMarket, asOf);
  const sessionDate = resolveDailyPnlSessionDate(listingMarket, asOf);
  const entryDay = entryDayKey(trade.entryDate, listingMarket);
  const quoteDaily = quoteDailyPnlForSession(
    trade,
    quote,
    sessionDate,
    listingMarket,
    asOf,
    {
      hasPriorSessionBar: hasPriorExchangeSessionBar(bars, entryDay, sessionDate),
    }
  );
  if (quoteDaily == null) return;

  // Live quotes are more accurate than stale/missing EOD bars for today.
  tradeDaily.set(today, quoteDaily);
}

/** Replace today's bar with quote-based daily P&L (matches the journal Daily P/L card). */
export function patchTodayDailyFromQuotes(
  daily: DailyPnlPoint[],
  trades: ActivePositionPnlInput[],
  quotesByTradeId: Record<string, LiveQuoteForDailyPnl | null | undefined>,
  currency: CurrencyCode,
  asOf = new Date(),
  priorSessionBarByTradeId: Record<string, boolean> = {}
): DailyPnlPoint[] {
  const todayTotals = new Map<string, { pnl: number; positions: number }>();

  for (const trade of trades) {
    if (trade.assetClass !== "Equities") continue;

    const quote = quotesByTradeId[trade.id];
    if (!quote?.price || quote.price <= 0) continue;

    const listingMarket = resolveListingMarket(trade, currency);
    const today = todayYmdForListingMarket(listingMarket, asOf);
    const sessionDate = resolveDailyPnlSessionDate(listingMarket, asOf);
    const entryDay = entryDayKey(trade.entryDate, listingMarket);
    const hasPriorSessionBar =
      priorSessionBarByTradeId[trade.id] ?? entryDay < sessionDate;
    const quoteDaily = quoteDailyPnlForSession(
      trade,
      quote,
      sessionDate,
      listingMarket,
      asOf,
      { hasPriorSessionBar }
    );
    if (quoteDaily == null) continue;

    const current = todayTotals.get(today) ?? { pnl: 0, positions: 0 };
    current.pnl = Math.round((current.pnl + quoteDaily) * 100) / 100;
    current.positions += 1;
    todayTotals.set(today, current);
  }

  if (todayTotals.size === 0) return daily;

  const next = [...daily];
  for (const [date, value] of todayTotals) {
    const index = next.findIndex((point) => point.date === date);
    const point: DailyPnlPoint = {
      date,
      pnl: value.pnl,
      trades: value.positions,
    };
    if (index >= 0) {
      next[index] = point;
    } else {
      next.push(point);
    }
  }

  return next.sort((a, b) => a.date.localeCompare(b.date));
}

export function tradeHasPriorSessionBar(
  trade: ActivePositionPnlInput,
  bars: OhlcvBar[],
  listingMarket: ListingMarketId,
  asOf = new Date()
): boolean {
  const sessionDate = resolveDailyPnlSessionDate(listingMarket, asOf);
  const entryDay = entryDayKey(trade.entryDate, listingMarket);
  return hasPriorExchangeSessionBar(bars, entryDay, sessionDate);
}

export function buildPriorSessionBarByTradeId(
  trades: ActivePositionPnlInput[],
  barsByTradeId: Record<string, OhlcvBar[]>,
  currency: CurrencyCode,
  asOf = new Date()
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const trade of trades) {
    const listingMarket = resolveListingMarket(trade, currency);
    const sessionDate = resolveDailyPnlSessionDate(listingMarket, asOf);
    const entryDay = entryDayKey(trade.entryDate, listingMarket);
    const bars = barsByTradeId[trade.id] ?? [];
    result[trade.id] = hasPriorExchangeSessionBar(bars, entryDay, sessionDate);
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
    fees: trade.fees,
  };
}

export type TodayDailyPnlSummary = {
  totalPnl: number;
  activeCount: number;
  pricedCount: number;
};

/** Today's session daily P&L for one active position from a live quote. */
export function computeTradeDailyPnlFromQuote(
  trade: ActivePositionPnlInput,
  quote: LiveQuoteForDailyPnl | null | undefined,
  currency: CurrencyCode,
  asOf = new Date(),
  priorSessionBarByTradeId: Record<string, boolean> = {}
): number | null {
  if (trade.assetClass !== "Equities") return null;
  if (!quote?.price || quote.price <= 0) return null;

  const listingMarket = resolveListingMarket(trade, currency);
  const sessionDate = resolveDailyPnlSessionDate(listingMarket, asOf);
  const entryDay = entryDayKey(trade.entryDate, listingMarket);
  const hasPriorSessionBar =
    priorSessionBarByTradeId[trade.id] ?? entryDay < sessionDate;

  return quoteDailyPnlForSession(trade, quote, sessionDate, listingMarket, asOf, {
    hasPriorSessionBar,
  });
}

/** Sum today's daily P&L for active positions using live/delayed quotes. */
export function computeTodayDailyPnlFromQuotes(
  trades: ActivePositionPnlInput[],
  quotesByTradeId: Record<string, LiveQuoteForDailyPnl | null | undefined>,
  currency: CurrencyCode,
  asOf = new Date(),
  priorSessionBarByTradeId: Record<string, boolean> = {}
): TodayDailyPnlSummary {
  let totalPnl = 0;
  let pricedCount = 0;

  for (const trade of trades) {
    const daily = computeTradeDailyPnlFromQuote(
      trade,
      quotesByTradeId[trade.id],
      currency,
      asOf,
      priorSessionBarByTradeId
    );
    if (daily == null) continue;

    totalPnl += daily;
    pricedCount += 1;
  }

  return {
    totalPnl: Math.round(totalPnl * 100) / 100,
    activeCount: trades.length,
    pricedCount,
  };
}

export function computeActivePositionDailyPnl(
  trades: ActivePositionPnlInput[],
  barsByTradeId: Record<string, OhlcvBar[]>,
  options: {
    asOf?: Date;
    currency?: CurrencyCode;
    quotesByTradeId?: Record<string, LiveQuoteForDailyPnl | null | undefined>;
  } = {}
): DailyPnlPoint[] {
  const asOf = options.asOf ?? new Date();
  const currency = options.currency ?? "USD";
  const totals = new Map<string, { pnl: number; positions: Set<string> }>();

  for (const trade of trades) {
    if (trade.assetClass !== "Equities") continue;

    const listingMarket = resolveListingMarket(trade, currency);
    const bars = barsByTradeId[trade.id] ?? [];
    const tradeDaily =
      bars.length > 0
        ? dailyPnlForTrade(trade, bars, listingMarket, asOf)
        : new Map<string, number>();

    const quote = options.quotesByTradeId?.[trade.id];
    if (quote?.price && quote.price > 0) {
      applyQuoteDailyForToday(
        trade,
        tradeDaily,
        quote,
        listingMarket,
        asOf,
        bars
      );
    }

    if (tradeDaily.size === 0) continue;

    for (const [date, pnl] of tradeDaily) {
      const current = totals.get(date) ?? { pnl: 0, positions: new Set<string>() };
      current.pnl = Math.round((current.pnl + pnl) * 100) / 100;
      current.positions.add(trade.id);
      totals.set(date, current);
    }
  }

  return Array.from(totals.entries())
    .map(([date, value]) => ({
      date,
      pnl: value.pnl,
      trades: value.positions.size,
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
