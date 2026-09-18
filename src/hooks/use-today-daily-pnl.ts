"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeTodayDailyPnlFromQuotes,
  enrichTodayDailyPnlWithPriorSession,
  toActivePositionPnlInput,
  type TodayDailyPnlSummary,
} from "@/lib/active-position-daily-pnl";
import {
  activePositionPnlCacheKey,
  loadActivePositionPnl,
  readActivePositionPnlCache,
} from "@/lib/active-position-pnl-cache";
import type { DailyPnlPoint } from "@/lib/analytics";
import { defaultListingMarketForCurrency } from "@/lib/equity-listing-markets";
import {
  readFrozenDailyPnl,
  withClosedSessionLiveSnapshot,
} from "@/lib/frozen-daily-pnl";
import { useFrozenDailyPnl } from "@/hooks/use-frozen-daily-pnl";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import {
  isExchangeSessionClosedForDate,
  todayYmdForListingMarket,
} from "@/lib/listing-market-hours";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";

/** Live today's daily P&L for all open positions (matches Analytics P&L chart). */
export function useTodayDailyPnl(
  trades: JournalTrade[],
  currency: CurrencyCode
): TodayDailyPnlSummary & {
  loading: boolean;
  quotesLoading: boolean;
} {
  const activePool = useMemo(
    () => trades.filter((trade) => (trade.status ?? "Closed") === "Active"),
    [trades]
  );

  const activeTrades = useMemo(
    () =>
      activePool
        .map(toActivePositionPnlInput)
        .filter((trade): trade is NonNullable<typeof trade> => trade != null),
    [activePool]
  );

  const pnlCacheKey = useMemo(
    () => activePositionPnlCacheKey(activeTrades, currency),
    [activeTrades, currency]
  );

  const [priorSessionBarByTradeId, setPriorSessionBarByTradeId] = useState<
    Record<string, boolean>
  >({});
  const [dailyPoints, setDailyPoints] = useState<DailyPnlPoint[]>([]);
  const [priorBarsLoading, setPriorBarsLoading] = useState(false);

  useEffect(() => {
    if (activeTrades.length === 0) {
      setPriorSessionBarByTradeId({});
      setDailyPoints([]);
      setPriorBarsLoading(false);
      return;
    }

    const cached = readActivePositionPnlCache(pnlCacheKey);
    if (cached) {
      setPriorSessionBarByTradeId(cached.priorSessionBarByTradeId);
      setDailyPoints(cached.daily);
      setPriorBarsLoading(false);
      return;
    }

    let cancelled = false;
    setPriorBarsLoading(true);

    void loadActivePositionPnl(activeTrades, currency)
      .then((payload) => {
        if (cancelled) return;
        setPriorSessionBarByTradeId(payload.priorSessionBarByTradeId);
        setDailyPoints(payload.daily);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setPriorSessionBarByTradeId({});
        setDailyPoints([]);
      })
      .finally(() => {
        if (!cancelled) setPriorBarsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTrades, currency, pnlCacheKey]);

  const listingMarket =
    activeTrades[0]?.listingMarket ??
    defaultListingMarketForCurrency(currency);
  const { getQuote, loading: quotesLoading, quoteRevision } = useMarketQuotes();
  const asOf = useMemo(
    () => new Date(),
    [dailyPoints, pnlCacheKey, quoteRevision]
  );
  const todayYmd = todayYmdForListingMarket(listingMarket, asOf);
  const sessionClosed = isExchangeSessionClosedForDate(
    listingMarket,
    todayYmd,
    asOf
  );
  const skipLiveRef = useRef(
    sessionClosed && Boolean(readFrozenDailyPnl(currency)[todayYmd])
  );
  if (!sessionClosed) skipLiveRef.current = false;
  const skipLiveQuotes = skipLiveRef.current;

  const liveSummary = useMemo(() => {
    if (skipLiveQuotes) {
      return {
        totalPnl: 0,
        activeCount: activeTrades.length,
        pricedCount: 0,
      };
    }

    const quotesByTradeId: Record<
      string,
      { price: number; changePercent?: number | null }
    > = {};

    for (const trade of activePool) {
      const quote = getQuote(trade);
      if (quote?.price != null && quote.price > 0) {
        quotesByTradeId[trade.id] = {
          price: quote.price,
          changePercent: quote.changePercent,
        };
      }
    }

    return computeTodayDailyPnlFromQuotes(
      activeTrades,
      quotesByTradeId,
      currency,
      asOf,
      priorSessionBarByTradeId
    );
  }, [
    activePool,
    activeTrades,
    asOf,
    currency,
    getQuote,
    priorSessionBarByTradeId,
    skipLiveQuotes,
    quoteRevision,
  ]);

  const closedSessionDaily = useMemo(
    () =>
      withClosedSessionLiveSnapshot(
        dailyPoints,
        liveSummary,
        listingMarket,
        asOf
      ),
    [asOf, dailyPoints, listingMarket, liveSummary]
  );

  const { daily: frozenDaily, todayFrozen } = useFrozenDailyPnl(
    closedSessionDaily,
    currency,
    listingMarket,
    asOf
  );
  if (todayFrozen) skipLiveRef.current = true;

  const summary = useMemo(() => {
    const displayLive = sessionClosed
      ? {
          totalPnl: 0,
          activeCount: liveSummary.activeCount,
          pricedCount: 0,
        }
      : liveSummary;

    return enrichTodayDailyPnlWithPriorSession(
      displayLive,
      frozenDaily,
      currency,
      asOf
    );
  }, [asOf, currency, frozenDaily, liveSummary, sessionClosed]);

  return {
    ...summary,
    loading: priorBarsLoading,
    quotesLoading: skipLiveQuotes ? false : quotesLoading,
  };
}
