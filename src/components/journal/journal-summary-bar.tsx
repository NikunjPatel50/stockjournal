import { memo, type ReactNode } from "react";
import { MetricHint } from "@/components/ui/metric-hint";
import { AnimatedValue } from "@/components/ui/animated-number";
import {
  formatCurrency,
  formatMarketPrice,
  type computeJournalSummary,
} from "@/lib/journal-types";
import type { FilteredPnlSummary, LiveActivePnlSummary } from "@/lib/trade-pnl";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { cn } from "@/lib/utils";

interface JournalSummaryBarProps {
  summary: ReturnType<typeof computeJournalSummary>;
  livePnl?: LiveActivePnlSummary | null;
  filteredPnl?: FilteredPnlSummary | null;
  livePnlLoading?: boolean;
  /** Wait until client storage/quotes are ready to avoid hydration mismatch. */
  liveDataReady?: boolean;
  displayCurrency?: CurrencyCode;
}

function statValueFontClass(value: string, largeValue?: boolean): string {
  const len = value.length;

  if (largeValue) {
    if (len <= 9) return "text-xl sm:text-2xl";
    if (len <= 12) return "text-lg sm:text-xl";
    if (len <= 15) return "text-base sm:text-lg";
    if (len <= 18) return "text-sm sm:text-base";
    return "text-xs sm:text-sm";
  }

  if (len <= 10) return "text-lg sm:text-xl";
  if (len <= 14) return "text-base sm:text-lg";
  if (len <= 18) return "text-sm sm:text-base";
  return "text-xs sm:text-sm";
}

function Stat({
  label,
  hint,
  value,
  subValue,
  valueClass,
  accent,
  largeValue,
  valueTitle,
}: {
  label: string;
  hint: string;
  value: ReactNode;
  valueTitle?: string;
  subValue?: string;
  valueClass?: string;
  accent?: "emerald" | "rose" | "slate";
  largeValue?: boolean;
}) {
  const topBorder =
    accent === "emerald"
      ? "border-t-emerald-500"
      : accent === "rose"
        ? "border-t-rose-500"
        : "border-t-border";

  return (
    <div
      className={cn(
        "flex h-full min-h-[4.75rem] min-w-0 flex-col rounded-lg border border-border bg-card px-4 py-3 shadow-none",
        "border-t-2",
        topBorder
      )}
    >
      <p className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <MetricHint title={label} hint={hint} />
      </p>
      <p
        className={cn(
          "mt-1.5 truncate text-center font-semibold",
          valueTitle
            ? statValueFontClass(valueTitle, largeValue)
            : largeValue
              ? "text-xl sm:text-2xl"
              : "text-lg sm:text-xl",
          valueClass ?? "text-foreground"
        )}
        title={valueTitle}
      >
        {value}
      </p>
      {subValue ? (
        <p className="mt-0.5 text-center text-xs text-muted-foreground">{subValue}</p>
      ) : null}
    </div>
  );
}

function tradeCountLabel(count: number) {
  return `${count} ${count === 1 ? "trade" : "trades"}`;
}

export const JournalSummaryBar = memo(function JournalSummaryBar({
  summary,
  livePnl,
  filteredPnl,
  livePnlLoading,
  liveDataReady = true,
  displayCurrency = DEFAULT_CURRENCY,
}: JournalSummaryBarProps) {
  const filteredTotal = filteredPnl?.totalPnl ?? summary.totalPnl;
  const pnlUp = filteredTotal > 0;
  const pnlDown = filteredTotal < 0;

  const liveUp = (livePnl?.totalPnl ?? 0) > 0;
  const liveDown = (livePnl?.totalPnl ?? 0) < 0;
  const hasActive = (livePnl?.activeCount ?? 0) > 0;
  const hasLivePrice = (livePnl?.pricedCount ?? 0) > 0;
  const hasFilteredActive = (filteredPnl?.activeCount ?? 0) > 0;
  const hasFilteredLivePrice = (filteredPnl?.pricedActiveCount ?? 0) > 0;

  const liveValue = !liveDataReady
    ? "…"
    : !hasActive
      ? formatCurrency(0, displayCurrency)
      : livePnlLoading && !hasLivePrice
        ? "…"
        : hasLivePrice
          ? livePnl!.totalPnl
          : "—";

  const filteredValue = !liveDataReady
    ? "…"
    : hasFilteredActive &&
        filteredPnl!.activeCount === summary.count &&
        livePnlLoading &&
        !hasFilteredLivePrice
      ? "…"
      : filteredTotal;

  const liveValueTitle =
    typeof liveValue === "number"
      ? formatCurrency(liveValue, displayCurrency)
      : liveValue;
  const filteredValueTitle =
    typeof filteredValue === "number"
      ? formatCurrency(filteredValue, displayCurrency)
      : filteredValue;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7">
      <Stat
        label="Daily P/L"
        hint="Combined price change today across open positions vs prior close (or from entry on day one). Updates live during market hours."
        value={
          <AnimatedValue
            value={liveValue}
            format={(amount) => formatCurrency(amount, displayCurrency)}
          />
        }
        valueTitle={liveValueTitle}
        largeValue
        accent={
          !liveDataReady || !hasActive || !hasLivePrice
            ? "slate"
            : liveUp
              ? "emerald"
              : liveDown
                ? "rose"
                : "slate"
        }
        valueClass={
          !liveDataReady || !hasActive || !hasLivePrice
            ? undefined
            : liveUp
              ? "text-emerald-700 dark:text-emerald-400"
              : liveDown
                ? "text-rose-700 dark:text-rose-400"
                : undefined
        }
      />
      <Stat
        label="Total P/L"
        hint="Net profit or loss for all trades in your current filter, including realized on closed trades plus live unrealized on open positions."
        value={
          <AnimatedValue
            value={filteredValue}
            format={(amount) => formatCurrency(amount, displayCurrency)}
          />
        }
        valueTitle={filteredValueTitle}
        largeValue
        accent={pnlUp ? "emerald" : pnlDown ? "rose" : "slate"}
        valueClass={
          filteredValueTitle === "…"
            ? undefined
            : pnlUp
              ? "text-emerald-700 dark:text-emerald-400"
              : pnlDown
                ? "text-rose-700 dark:text-rose-400"
                : undefined
        }
      />
      <Stat
        label="Win rate"
        hint="Share of trades marked as wins out of all trades in your current filter."
        value={`${summary.winRate.toFixed(1)}%`}
        largeValue
      />
      <Stat
        label="Accuracy %"
        hint="Win rate among decided outcomes only: wins divided by wins plus losses, excluding open and breakeven trades."
        value={`${summary.accuracyPercent.toFixed(1)}%`}
        largeValue
        accent={
          summary.accuracyPercent >= 50
            ? "emerald"
            : summary.accuracyPercent > 0
              ? "rose"
              : "slate"
        }
        valueClass={
          summary.accuracyPercent >= 50
            ? "text-emerald-700 dark:text-emerald-400"
            : summary.accuracyPercent > 0
              ? "text-rose-700 dark:text-rose-400"
              : undefined
        }
      />
      <Stat
        label="Total invested"
        hint="Total capital deployed in open positions (entry price × quantity)."
        value={formatMarketPrice(summary.totalInvested, displayCurrency)}
        subValue={tradeCountLabel(summary.activeCount)}
      />
      <Stat
        label="Total win"
        hint="Sum of all positive P&L from winning trades in your current filter."
        value={formatCurrency(summary.totalWin, displayCurrency)}
        subValue={tradeCountLabel(summary.winningTrades)}
        accent={summary.totalWin > 0 ? "emerald" : "slate"}
        valueClass={
          summary.totalWin > 0
            ? "text-emerald-700 dark:text-emerald-400"
            : undefined
        }
      />
      <Stat
        label="Total loss"
        hint="Sum of all losses from losing trades in your current filter, shown as a negative amount."
        value={formatCurrency(-summary.totalLoss, displayCurrency)}
        subValue={tradeCountLabel(summary.losingTrades)}
        accent={summary.totalLoss > 0 ? "rose" : "slate"}
        valueClass={
          summary.totalLoss > 0
            ? "text-rose-700 dark:text-rose-400"
            : undefined
        }
      />
    </div>
  );
});
