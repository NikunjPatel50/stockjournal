import {
  formatCurrency,
  formatHoldTime,
  type computeJournalSummary,
} from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

interface JournalSummaryBarProps {
  summary: ReturnType<typeof computeJournalSummary>;
}

function Stat({
  label,
  value,
  valueClass,
  accent,
}: {
  label: string;
  value: string;
  valueClass?: string;
  accent?: "emerald" | "rose" | "slate";
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
        "flex h-full min-h-[5.5rem] min-w-0 flex-col rounded-lg border border-border bg-card px-4 py-3 shadow-none",
        "border-t-2",
        topBorder
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 truncate text-2xl font-semibold sm:text-[1.625rem]",
          NUMERIC_CLASS,
          valueClass ?? "text-foreground"
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export function JournalSummaryBar({ summary }: JournalSummaryBarProps) {
  const pnlUp = summary.totalPnl > 0;
  const pnlDown = summary.totalPnl < 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <Stat
        label="Filtered P&L"
        value={formatCurrency(summary.totalPnl)}
        accent={pnlUp ? "emerald" : pnlDown ? "rose" : "slate"}
        valueClass={
          pnlUp
            ? "text-emerald-700 dark:text-emerald-400"
            : pnlDown
              ? "text-rose-700 dark:text-rose-400"
              : undefined
        }
      />
      <Stat label="Win rate" value={`${summary.winRate.toFixed(1)}%`} />
      <Stat
        label="Accuracy %"
        value={`${summary.accuracyPercent.toFixed(1)}%`}
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
        label="Avg hold time"
        value={formatHoldTime(summary.avgHoldHours)}
      />
      <Stat
        label="Total loss"
        value={formatCurrency(-summary.totalLoss)}
        accent={summary.totalLoss > 0 ? "rose" : "slate"}
        valueClass={
          summary.totalLoss > 0
            ? "text-rose-700 dark:text-rose-400"
            : undefined
        }
      />
      <Stat
        label="Winning trades"
        value={String(summary.winningTrades)}
        accent={summary.winningTrades > 0 ? "emerald" : "slate"}
        valueClass={
          summary.winningTrades > 0
            ? "text-emerald-700 dark:text-emerald-400"
            : undefined
        }
      />
      <Stat
        label="Losing trades"
        value={String(summary.losingTrades)}
        accent={summary.losingTrades > 0 ? "rose" : "slate"}
        valueClass={
          summary.losingTrades > 0
            ? "text-rose-700 dark:text-rose-400"
            : undefined
        }
      />
    </div>
  );
}
