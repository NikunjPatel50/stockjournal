"use client";

import { useMemo } from "react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  computePnlBreakdown,
  formatMoney,
  type PnlBreakdownStats,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type EdgePanelProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

function AsymmetryAxis({
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
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className={cn("font-medium text-rose-600 dark:text-rose-400", NUMERIC_CLASS)}>
          {formatMoney(stats.avgLoss, true, currency)}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Average outcome
        </span>
        <span
          className={cn(
            "font-medium text-emerald-600 dark:text-emerald-400",
            NUMERIC_CLASS
          )}
        >
          {formatMoney(stats.avgWin, true, currency)}
        </span>
      </div>
      <div className="relative mt-2 flex h-2.5 overflow-hidden rounded-full bg-muted/60">
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
  tone?: "profit" | "loss";
}) {
  return (
    <div className="bg-card px-3 py-2.5">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-semibold",
          NUMERIC_CLASS,
          tone === "profit" && "text-emerald-600 dark:text-emerald-400",
          tone === "loss" && "text-rose-600 dark:text-rose-400"
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
  const payoff =
    Math.abs(stats.avgLoss) > 0 ? stats.avgWin / Math.abs(stats.avgLoss) : null;

  return (
    <DataPanel
      title="Win / loss asymmetry"
      subtitle="Size of the average winner against the average loser"
      meta={`${decided} decided`}
      footer={
        payoff != null
          ? `A payoff ratio of ${payoff.toFixed(2)} needs a ${((1 / (1 + payoff)) * 100).toFixed(1)}% win rate to break even.`
          : undefined
      }
    >
      {decided === 0 ? (
        <PanelEmpty
          title="No wins or losses yet"
          hint="Close at least one winning and one losing trade to compare outcome sizes."
        />
      ) : (
        <div className="space-y-4">
          <AsymmetryAxis stats={stats} currency={currency} />

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 sm:grid-cols-3">
            <StatCell
              label="Payoff ratio"
              value={payoff != null ? `${payoff.toFixed(2)}×` : "—"}
            />
            <StatCell
              label="Largest win"
              value={formatMoney(stats.largestWin, true, currency)}
              tone="profit"
            />
            <StatCell
              label="Largest loss"
              value={formatMoney(stats.largestLoss, true, currency)}
              tone="loss"
            />
            <StatCell
              label="Win streak"
              value={String(stats.maxConsecutiveWins)}
            />
            <StatCell
              label="Loss streak"
              value={String(stats.maxConsecutiveLosses)}
            />
            <StatCell
              label="Breakeven"
              value={String(stats.breakevenCount)}
            />
            <StatCell label="Best symbol" value={stats.bestTradeTicker} />
            <StatCell label="Worst symbol" value={stats.worstTradeTicker} />
            <StatCell
              label="Gross profit"
              value={formatMoney(stats.grossProfit, false, currency)}
              tone="profit"
            />
          </div>
        </div>
      )}
    </DataPanel>
  );
}
