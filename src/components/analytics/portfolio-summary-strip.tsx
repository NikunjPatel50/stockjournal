"use client";

import { memo, useMemo, type ReactNode } from "react";
import { AnimatedNumber, AnimatedPercent } from "@/components/ui/animated-number";
import { formatMoney, formatSignedPercent } from "@/lib/analytics";
import { useTodayDailyPnl } from "@/hooks/use-today-daily-pnl";
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
  valueTitle,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueTitle?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 bg-card px-4 py-3 text-center sm:px-5 sm:py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-balance text-sm font-semibold sm:text-base sm:text-lg",
          valueClassName
        )}
        title={valueTitle}
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
  const todayDailyPnl = useTodayDailyPnl(trades, currency);

  const snapshot = useMemo(
    () => computeLivePortfolioSnapshot(trades, getQuote, currency),
    [trades, getQuote, currency, quoteRevision]
  );

  const activeTrades = useMemo(
    () => trades.filter((trade) => (trade.status ?? "Closed") === "Active"),
    [trades]
  );

  const todayPnl =
    activeTrades.length === 0
      ? 0
      : todayDailyPnl.pricedCount > 0
        ? todayDailyPnl.totalPnl
        : null;

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

  const overallPnlTitle =
    overallPct != null
      ? `${formatMoney(snapshot.totalPnl, true, currency)} (${formatSignedPercent(overallPct, 2)})`
      : formatMoney(snapshot.totalPnl, true, currency);

  const todayPnlTitle =
    todayPnl == null
      ? "—"
      : `${formatMoney(todayPnl, true, currency)} (${formatSignedPercent(todayPct, 2)})`;

  return (
    <div className="grid gap-px overflow-hidden rounded-xl border-2 border-border bg-border/70 [grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))]">
      <SummaryCell
        label="Investment"
        value={
          <AnimatedNumber
            value={snapshot.invested}
            format={(amount) => formatMoney(amount, false, currency)}
          />
        }
        valueTitle={formatMoney(snapshot.invested, false, currency)}
      />
      <SummaryCell
        label="Current Value"
        value={
          <AnimatedNumber
            value={snapshot.portfolioValue}
            format={(amount) => formatMoney(amount, false, currency)}
          />
        }
        valueTitle={formatMoney(snapshot.portfolioValue, false, currency)}
      />
      <SummaryCell
        label="Overall P&L"
        value={
          <span className={NUMERIC_DISPLAY_CLASS}>
            <AnimatedNumber
              value={snapshot.totalPnl}
              format={(amount) => formatMoney(amount, true, currency)}
            />
            {overallPct != null ? (
              <>
                {" ("}
                <AnimatedPercent value={overallPct} decimals={2} />
                {")"}
              </>
            ) : null}
          </span>
        }
        valueTitle={overallPnlTitle}
        valueClassName={pnlToneClass(snapshot.totalPnl)}
      />
      <SummaryCell
        label="Today's P&L"
        value={
          todayPnl == null ? (
            "—"
          ) : (
            <span className={NUMERIC_DISPLAY_CLASS}>
              <AnimatedNumber
                value={todayPnl}
                format={(amount) => formatMoney(amount, true, currency)}
              />
              {" ("}
              <AnimatedPercent value={todayPct} decimals={2} />
              {")"}
            </span>
          )
        }
        valueTitle={todayPnlTitle}
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
