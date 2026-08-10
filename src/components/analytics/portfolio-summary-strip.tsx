"use client";

import { memo, useMemo } from "react";
import { formatMoney, formatSignedPercent } from "@/lib/analytics";
import {
  computeTodayDailyPnlFromQuotes,
  toActivePositionPnlInput,
} from "@/lib/active-position-daily-pnl";
import { computeLivePortfolioSnapshot } from "@/lib/portfolio-timeline";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

type PortfolioSummaryStripProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

function pnlToneClass(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

function SummaryCell({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 bg-card px-4 py-3 text-center sm:px-5 sm:py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-base font-semibold sm:text-lg",
          NUMERIC_DISPLAY_CLASS,
          valueClassName
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export const PortfolioSummaryStrip = memo(function PortfolioSummaryStrip({
  trades,
  currency,
}: PortfolioSummaryStripProps) {
  const { getQuote, quoteRevision } = useMarketQuotes();

  const snapshot = useMemo(
    () => computeLivePortfolioSnapshot(trades, getQuote, currency),
    [trades, getQuote, currency, quoteRevision]
  );

  const activeTrades = useMemo(
    () => trades.filter((trade) => (trade.status ?? "Closed") === "Active"),
    [trades]
  );

  const todayPnl = useMemo(() => {
    if (activeTrades.length === 0) return 0;

    const inputs = activeTrades
      .map(toActivePositionPnlInput)
      .filter((trade): trade is NonNullable<typeof trade> => trade != null);

    const quotesByTradeId: Record<
      string,
      { price: number; changePercent?: number | null }
    > = {};

    for (const trade of activeTrades) {
      const quote = getQuote(trade);
      if (quote?.price != null && quote.price > 0) {
        quotesByTradeId[trade.id] = {
          price: quote.price,
          changePercent: quote.changePercent,
        };
      }
    }

    const summary = computeTodayDailyPnlFromQuotes(
      inputs,
      quotesByTradeId,
      currency
    );

    return summary.pricedCount > 0 ? summary.totalPnl : null;
  }, [activeTrades, getQuote, currency, quoteRevision]);

  const overallPct =
    snapshot.invested > 0
      ? (snapshot.totalPnl / snapshot.invested) * 100
      : null;

  const startOfDayValue =
    todayPnl != null ? snapshot.portfolioValue - todayPnl : null;
  const todayPct =
    todayPnl != null && startOfDayValue != null && startOfDayValue > 0
      ? (todayPnl / startOfDayValue) * 100
      : todayPnl != null && todayPnl !== 0
        ? 100
        : 0;

  const overallPnlLabel =
    overallPct != null
      ? `${formatMoney(snapshot.totalPnl, true, currency)} (${formatSignedPercent(overallPct, 2)})`
      : formatMoney(snapshot.totalPnl, true, currency);

  const todayPnlLabel =
    todayPnl == null
      ? "—"
      : `${formatMoney(todayPnl, true, currency)} (${formatSignedPercent(todayPct, 2)})`;

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border-2 border-border bg-border/70 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCell
        label="Investment"
        value={formatMoney(snapshot.invested, false, currency)}
      />
      <SummaryCell
        label="Current Value"
        value={formatMoney(snapshot.portfolioValue, false, currency)}
      />
      <SummaryCell
        label="Overall P&L"
        value={overallPnlLabel}
        valueClassName={pnlToneClass(snapshot.totalPnl)}
      />
      <SummaryCell
        label="Today's P&L"
        value={todayPnlLabel}
        valueClassName={
          todayPnl == null ? undefined : pnlToneClass(todayPnl)
        }
      />
      <SummaryCell
        label="Total Active Trades"
        value={String(activeTrades.length)}
      />
    </div>
  );
});
