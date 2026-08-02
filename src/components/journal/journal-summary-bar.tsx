import {
  formatCurrency,
  formatMarketPrice,
  type computeJournalSummary,
} from "@/lib/journal-types";
import type { FilteredPnlSummary, LiveActivePnlSummary } from "@/lib/trade-pnl";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

interface JournalSummaryBarProps {
  summary: ReturnType<typeof computeJournalSummary>;
  livePnl?: LiveActivePnlSummary | null;
  filteredPnl?: FilteredPnlSummary | null;
  livePnlLoading?: boolean;
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
  value,
  subValue,
  valueClass,
  accent,
  largeValue,
}: {
  label: string;
  value: string;
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
      <p className="text-center text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 truncate text-center font-semibold",
          statValueFontClass(value, largeValue),
          NUMERIC_CLASS,
          valueClass ?? "text-foreground"
        )}
        title={value}
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

export function JournalSummaryBar({
  summary,
  livePnl,
  filteredPnl,
  livePnlLoading,
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

  const liveValue = !hasActive
    ? formatCurrency(0)
    : livePnlLoading && !hasLivePrice
      ? "…"
      : hasLivePrice
        ? formatCurrency(livePnl!.totalPnl)
        : "—";

  const filteredValue =
    hasFilteredActive &&
    filteredPnl!.activeCount === summary.count &&
    livePnlLoading &&
    !hasFilteredLivePrice
      ? "…"
      : formatCurrency(filteredTotal);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7">
      <Stat
        label="Daily P/L"
        value={liveValue}
        largeValue
        accent={
          !hasActive || !hasLivePrice
            ? "slate"
            : liveUp
              ? "emerald"
              : liveDown
                ? "rose"
                : "slate"
        }
        valueClass={
          !hasActive || !hasLivePrice
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
        value={filteredValue}
        largeValue
        accent={pnlUp ? "emerald" : pnlDown ? "rose" : "slate"}
        valueClass={
          filteredValue === "…"
            ? undefined
            : pnlUp
              ? "text-emerald-700 dark:text-emerald-400"
              : pnlDown
                ? "text-rose-700 dark:text-rose-400"
                : undefined
        }
      />
      <Stat label="Win rate" value={`${summary.winRate.toFixed(1)}%`} largeValue />
      <Stat
        label="Accuracy %"
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
        value={formatMarketPrice(summary.totalInvested)}
        subValue={tradeCountLabel(summary.count)}
      />
      <Stat
        label="Total win"
        value={formatCurrency(summary.totalWin)}
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
        value={formatCurrency(-summary.totalLoss)}
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
}
