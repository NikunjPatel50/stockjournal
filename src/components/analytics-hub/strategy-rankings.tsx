"use client";

import { useMemo } from "react";
import { HubPanel } from "@/components/analytics-hub/hub-panel";
import {
  computeStrategyMetrics,
  formatMoney,
  formatPercent,
  formatPf,
  type StrategyMetric,
} from "@/lib/analytics";
import { formatHoldTime } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type StrategyRankingsProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

function StrategyRow({
  row,
  rank,
  maxAbsPnl,
  currency,
}: {
  row: StrategyMetric;
  rank: number;
  maxAbsPnl: number;
  currency: CurrencyCode;
}) {
  const barWidth = maxAbsPnl
    ? Math.min(100, (Math.abs(row.totalPnl) / maxAbsPnl) * 100)
    : 0;
  const positive = row.totalPnl >= 0;

  return (
    <div className="group rounded-xl border border-border/50 bg-muted/20 p-3 transition-colors hover:bg-muted/35">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background text-[11px] font-bold text-muted-foreground ring-1 ring-border/60">
            {rank}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{row.strategy}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.trades} trades · {formatPercent(row.winRate)} wins · PF{" "}
              {formatPf(row.profitFactor)}
            </p>
          </div>
        </div>
        <p
          className={cn(
            "shrink-0 text-sm font-semibold",
            NUMERIC_CLASS,
            positive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          {formatMoney(row.totalPnl, true, currency)}
        </p>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted/80">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            positive ? "bg-emerald-500" : "bg-rose-500"
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span>Avg hold {formatHoldTime(row.avgDurationHours)}</span>
        <span>Max DD {formatMoney(row.maxDrawdown, true, currency)}</span>
      </div>
    </div>
  );
}

export function StrategyRankings({ trades, currency }: StrategyRankingsProps) {
  const strategies = useMemo(() => computeStrategyMetrics(trades), [trades]);
  const maxAbsPnl = useMemo(
    () => Math.max(1, ...strategies.map((s) => Math.abs(s.totalPnl))),
    [strategies]
  );

  return (
    <HubPanel
      title="Strategy leaderboard"
      subtitle="Ranked by total P&L — see which setups carry your edge"
    >
      {strategies.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No strategy data in this range.
        </p>
      ) : (
        <div className="space-y-2">
          {strategies.map((row, i) => (
            <StrategyRow
              key={row.strategy}
              row={row}
              rank={i + 1}
              maxAbsPnl={maxAbsPnl}
              currency={currency}
            />
          ))}
        </div>
      )}
    </HubPanel>
  );
}
