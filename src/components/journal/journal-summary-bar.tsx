import { memo, type ReactNode } from "react";
import { MetricHint } from "@/components/ui/metric-hint";
import { AnimatedNumber, AnimatedValue } from "@/components/ui/animated-number";
import {
  formatCurrency,
  formatMarketPrice,
  type computeJournalSummary,
} from "@/lib/journal-types";
import type {
  FilteredPnlSummary,
  LiveActivePnlSummary,
  OpenPositionsNetPnlSummary,
} from "@/lib/trade-pnl";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { cn } from "@/lib/utils";

interface JournalSummaryBarProps {
  summary: ReturnType<typeof computeJournalSummary>;
  livePnl?: LiveActivePnlSummary | null;
  filteredPnl?: FilteredPnlSummary | null;
  openPositionsNetPnl?: OpenPositionsNetPnlSummary | null;
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
  labelShort,
  hint,
  value,
  subValue,
  valueClass,
  accent,
  largeValue,
  valueTitle,
}: {
  label: string;
  labelShort?: string;
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

  const displayLabel = labelShort ?? label;

  return (
    <div
      className={cn(
        "flex h-full min-h-[4.5rem] min-w-0 flex-col rounded-lg border border-border bg-card px-3 py-2.5 shadow-none sm:min-h-[4.75rem] sm:px-4 sm:py-3",
        "border-t-2",
        topBorder
      )}
    >
      <p className="flex min-w-0 items-start justify-center gap-1 px-0.5 text-[10px] font-medium leading-snug text-muted-foreground sm:items-center sm:text-xs">
        <span className="text-center text-balance">
          {labelShort ? (
            <>
              <span className="sm:hidden">{labelShort}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </span>
        <MetricHint title={displayLabel} hint={hint} />
      </p>
      <div
        className={cn(
          "mt-1.5 flex min-w-0 flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-balance text-center font-semibold",
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
      </div>
      {subValue ? (
        <p className="mt-0.5 text-center text-xs text-muted-foreground">{subValue}</p>
      ) : null}
    </div>
  );
}

export const JournalSummaryBar = memo(function JournalSummaryBar({
  summary,
  livePnl,
  filteredPnl,
  openPositionsNetPnl,
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

  const openPnlNumeric = openPositionsNetPnl?.totalPnl ?? 0;
  const openActiveCount = openPositionsNetPnl?.activeCount ?? 0;
  const hasOpenPositions = openActiveCount > 0;
  const openPnlValue = !liveDataReady
    ? "…"
    : !hasOpenPositions
      ? formatCurrency(0, displayCurrency)
      : openPnlNumeric;

  const openPnlUp = openPnlNumeric > 0;
  const openPnlDown = openPnlNumeric < 0;
  const openPnlRoi = openPositionsNetPnl?.totalRoi ?? null;
  const openPnlValueTitle =
    typeof openPnlValue === "number"
      ? openPnlRoi != null
        ? `${formatCurrency(openPnlValue, displayCurrency)} (${openPnlRoi >= 0 ? "+" : ""}${openPnlRoi.toFixed(2)}%)`
        : formatCurrency(openPnlValue, displayCurrency)
      : openPnlValue;

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
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
      />
      <Stat
        label="Net P/L across open positions"
        labelShort="Open net P&L"
        hint="Sum of the Net P&L values shown for each row in the active trade log."
        value={
          typeof openPnlValue === "number" ? (
            <>
              <AnimatedNumber
                value={openPnlValue}
                format={(amount) => formatCurrency(amount, displayCurrency)}
              />
              {openPnlRoi != null ? (
                <span className="text-[11px] font-medium opacity-80 sm:text-xs">
                  ({openPnlRoi >= 0 ? "+" : ""}
                  {openPnlRoi.toFixed(2)}%)
                </span>
              ) : null}
            </>
          ) : (
            openPnlValue
          )
        }
        valueTitle={openPnlValueTitle}
        largeValue
        accent={
          !liveDataReady || !hasOpenPositions
            ? "slate"
            : openPnlUp
              ? "emerald"
              : openPnlDown
                ? "rose"
                : "slate"
        }
        valueClass={
          !liveDataReady || !hasOpenPositions
            ? undefined
            : openPnlUp
              ? "text-emerald-700 dark:text-emerald-400"
              : openPnlDown
                ? "text-rose-700 dark:text-rose-400"
                : undefined
        }
      />
      <Stat
        label="Total win"
        hint="Sum of all positive P&L from winning trades in your current filter."
        value={formatCurrency(summary.totalWin, displayCurrency)}
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
