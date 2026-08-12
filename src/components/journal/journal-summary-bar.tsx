import { memo } from "react";
import { Info } from "lucide-react";
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
  /** Wait until client storage/quotes are ready to avoid hydration mismatch. */
  liveDataReady?: boolean;
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
}: {
  label: string;
  hint: string;
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
      <p className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <MetricHint title={label} hint={hint} />
      </p>
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

function MetricHint({ title, hint }: { title: string; hint: string }) {
  return (
    <span className="group/hint relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 group-focus-within/hint:bg-muted group-focus-within/hint:text-foreground"
        aria-label={`About ${title}`}
      >
        <Info className="size-3" strokeWidth={2} aria-hidden />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-[min(calc(100vw-2rem),16.5rem)] -translate-x-1/2 sm:left-0 sm:translate-x-0",
          "rounded-lg border border-border/80 bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10",
          "invisible opacity-0 transition-[opacity,visibility] duration-150",
          "group-hover/hint:visible group-hover/hint:opacity-100",
          "group-focus-within/hint:visible group-focus-within/hint:opacity-100"
        )}
      >
        <span className="block text-xs font-semibold leading-snug text-foreground">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {hint}
        </span>
      </span>
    </span>
  );
}

export const JournalSummaryBar = memo(function JournalSummaryBar({
  summary,
  livePnl,
  filteredPnl,
  livePnlLoading,
  liveDataReady = true,
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
      ? formatCurrency(0)
      : livePnlLoading && !hasLivePrice
        ? "…"
        : hasLivePrice
          ? formatCurrency(livePnl!.totalPnl)
          : "—";

  const filteredValue = !liveDataReady
    ? "…"
    : hasFilteredActive &&
    filteredPnl!.activeCount === summary.count &&
    livePnlLoading &&
    !hasFilteredLivePrice
      ? "…"
      : formatCurrency(filteredTotal);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7">
      <Stat
        label="Daily P/L"
        hint="Combined price change today across open positions vs prior close (or from entry on day one). Updates live during market hours."
        value={liveValue}
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
        hint="Net profit or loss for all trades in your current filter—realized on closed trades plus live unrealized on open positions."
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
      <Stat
        label="Win rate"
        hint="Share of trades marked as wins out of all trades in your current filter."
        value={`${summary.winRate.toFixed(1)}%`}
        largeValue
      />
      <Stat
        label="Accuracy %"
        hint="Win rate among decided outcomes only—wins divided by wins plus losses, excluding open and breakeven trades."
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
        value={formatMarketPrice(summary.totalInvested)}
        subValue={tradeCountLabel(summary.activeCount)}
      />
      <Stat
        label="Total win"
        hint="Sum of all positive P&L from winning trades in your current filter."
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
        hint="Sum of all losses from losing trades in your current filter, shown as a negative amount."
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
});
