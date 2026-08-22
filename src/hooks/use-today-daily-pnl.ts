"use client";

import { useEffect, useMemo, useState } from "react";
import {
  computeTodayDailyPnlFromQuotes,
  enrichTodayDailyPnlWithPriorSession,
  toActivePositionPnlInput,
  type ActivePositionPnlInput,
  type TodayDailyPnlSummary,
} from "@/lib/active-position-daily-pnl";
import {
  readActivePositionPnlCache,
  writeActivePositionPnlCache,
} from "@/lib/active-position-pnl-cache";
import type { DailyPnlPoint } from "@/lib/analytics";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";

function buildActiveTradesKey(trades: ActivePositionPnlInput[]) {
  return trades
    .map(
      (trade) =>
        `${trade.id}:${trade.quantity}:${trade.entryPrice}:${trade.entryDate}`
    )
    .join("|");
}

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
    () => `${currency}:${buildActiveTradesKey(activeTrades)}`,
    [currency, activeTrades]
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

    const controller = new AbortController();
    setPriorBarsLoading(true);

    void fetch("/api/market-data/active-position-pnl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trades: activeTrades,
        currency,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          error?: string;
          daily?: DailyPnlPoint[];
          priorSessionBarByTradeId?: Record<string, boolean>;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load active position P&L");
        }

        const nextPrior = data.priorSessionBarByTradeId ?? {};
        const nextDaily = Array.isArray(data.daily) ? data.daily : [];
        setPriorSessionBarByTradeId(nextPrior);
        setDailyPoints(nextDaily);
        writeActivePositionPnlCache(pnlCacheKey, {
          daily: nextDaily,
          priorSessionBarByTradeId: nextPrior,
        });
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setPriorSessionBarByTradeId({});
        setDailyPoints([]);
      })
      .finally(() => {
        setPriorBarsLoading(false);
      });

    return () => controller.abort();
  }, [activeTrades, currency, pnlCacheKey]);

  const { getQuote, loading: quotesLoading, quoteRevision } = useMarketQuotes();

  const summary = useMemo(() => {
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

    return enrichTodayDailyPnlWithPriorSession(
      computeTodayDailyPnlFromQuotes(
        activeTrades,
        quotesByTradeId,
        currency,
        new Date(),
        priorSessionBarByTradeId
      ),
      dailyPoints,
      currency
    );
  }, [
    activePool,
    activeTrades,
    currency,
    dailyPoints,
    getQuote,
    priorSessionBarByTradeId,
    quoteRevision,
  ]);

  return {
    ...summary,
    loading: priorBarsLoading,
    quotesLoading,
  };
}
