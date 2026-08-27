"use client";

import { useMemo } from "react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  computePnlBreakdown,
  formatMoney,
  formatPercent,
  type PnlBreakdownStats,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type EdgePanelProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

function WinLossBar({
  stats,
  currency,
}: {
  stats: PnlBreakdownStats;
  currency: CurrencyCode;
}) {
  const maxSide = Math.max(stats.avgWin, Math.abs(stats.avgLoss), 1);
  const winWidth = (stats.avgWin / maxSide) * 100;
  const lossWidth = (Math.abs(stats.avgLoss) / maxSide) * 100;

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Avg loss</p>
          <p
            className={cn(
              "mt-0.5 truncate font-semibold text-rose-600 dark:text-rose-400",
              NUMERIC_CLASS
            )}
          >
            {formatMoney(stats.avgLoss, true, currency)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs text-muted-foreground">Avg win</p>
          <p
            className={cn(
              "mt-0.5 truncate font-semibold text-emerald-600 dark:text-emerald-400",
              NUMERIC_CLASS
            )}
          >
            {formatMoney(stats.avgWin, true, currency)}
          </p>
        </div>
      </div>
      <div className="relative mt-3 flex h-3 overflow-hidden rounded-full bg-muted/60">
        <div className="flex w-1/2 justify-end">
          <div
            className="h-full rounded-l-full bg-rose-500"
            style={{ width: `${lossWidth}%` }}
          />
        </div>
        <div className="flex w-1/2">
          <div
            className="h-full rounded-r-full bg-emerald-500"
            style={{ width: `${winWidth}%` }}
          />
        </div>
        <span
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-background"
          aria-hidden
        />
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-base font-semibold",
          NUMERIC_CLASS,
          tone === "profit" && "text-emerald-600 dark:text-emerald-400",
          tone === "loss" && "text-rose-600 dark:text-rose-400",
          tone === "neutral" && "text-foreground"
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export function EdgePanel({ trades, currency }: EdgePanelProps) {
  const stats = useMemo(() => computePnlBreakdown(trades), [trades]);
  const decided = stats.winCount + stats.lossCount;
  const winRate = decided ? (stats.winCount / decided) * 100 : 0;
  const payoff =
    Math.abs(stats.avgLoss) > 0 ? stats.avgWin / Math.abs(stats.avgLoss) : null;
  const breakEvenRate =
    payoff != null && payoff > 0 ? (1 / (1 + payoff)) * 100 : null;

  return (
    <DataPanel
      title="Wins vs losses"
      subtitle="How big your winners are compared to your losers"
      meta={`${decided} trades`}
      footer={
        breakEvenRate != null
          ? `At these sizes, you need about ${breakEvenRate.toFixed(0)}% winners to break even.`
          : undefined
      }
    >
      {decided === 0 ? (
        <PanelEmpty
          title="No wins or losses yet"
          hint="Close trades with a profit or loss to compare average outcomes."
        />
      ) : (
        <div className="space-y-4">
          <WinLossBar stats={stats} currency={currency} />

          <div className="grid grid-cols-2 gap-3">
            <StatCell label="Win rate" value={formatPercent(winRate)} />
            <StatCell
              label="Net P&L"
              value={formatMoney(stats.netPnl, true, currency)}
              tone={
                stats.netPnl > 0
                  ? "profit"
                  : stats.netPnl < 0
                    ? "loss"
                    : "neutral"
              }
            />
            <StatCell
              label="Best trade"
              value={formatMoney(stats.largestWin, true, currency)}
              tone="profit"
            />
            <StatCell
              label="Worst trade"
              value={formatMoney(stats.largestLoss, true, currency)}
              tone="loss"
            />
          </div>
        </div>
      )}
    </DataPanel>
  );
}
