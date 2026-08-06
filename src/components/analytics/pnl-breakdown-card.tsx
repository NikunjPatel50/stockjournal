"use client";

import { useMemo } from "react";
import {
  dashboardAnalyticsCardClass,
  dashboardAnalyticsContentClass,
  dashboardAnalyticsDescriptionClass,
  dashboardAnalyticsHeaderClass,
  dashboardAnalyticsTitleClass,
  dashboardChartBodyMinClass,
} from "@/components/analytics/dashboard-card-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computePnlBreakdown, formatMoney } from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

function pct(count: number, total: number) {
  if (!total) return "0.0%";
  return `${((count / total) * 100).toFixed(1)}%`;
}

function OutcomeSpectrum({
  winShare,
  lossShare,
  breakevenShare,
  winRate,
  netPnl,
  metricLabel,
}: {
  winShare: number;
  lossShare: number;
  breakevenShare: number;
  winRate: number;
  netPnl: number;
  metricLabel: string;
}) {
  const netUp = netPnl > 0;
  const netDown = netPnl < 0;

  return (
    <div className="w-full space-y-2 rounded-lg border border-border/80 bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={cn("text-2xl font-bold leading-none text-foreground", NUMERIC_DISPLAY_CLASS)}>
            {winRate.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Win rate · {metricLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Net P&L
          </p>
          <p
            className={cn(
              "mt-0.5 text-sm font-semibold leading-tight",
              NUMERIC_CLASS,
              netUp && "text-emerald-600 dark:text-emerald-400",
              netDown && "text-rose-600 dark:text-rose-400",
              !netUp && !netDown && "text-foreground"
            )}
          >
            {formatMoney(netPnl)}
          </p>
        </div>
      </div>

      <div className="flex h-3.5 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/60">
        {winShare > 0 ? (
          <div
            className="h-full bg-emerald-600 transition-[width] duration-300 dark:bg-emerald-500"
            style={{ width: `${winShare}%` }}
            title={`Wins ${winShare.toFixed(1)}%`}
          />
        ) : null}
        {lossShare > 0 ? (
          <div
            className="h-full bg-rose-600 transition-[width] duration-300 dark:bg-rose-500"
            style={{ width: `${lossShare}%` }}
            title={`Losses ${lossShare.toFixed(1)}%`}
          />
        ) : null}
        {breakevenShare > 0 ? (
          <div
            className="h-full bg-slate-500 transition-[width] duration-300"
            style={{ width: `${breakevenShare}%` }}
            title={`Breakeven ${breakevenShare.toFixed(1)}%`}
          />
        ) : null}
      </div>

      <div
        className={cn(
          "flex flex-wrap justify-between gap-x-2 gap-y-1 text-xs font-semibold",
          NUMERIC_CLASS
        )}
      >
        <span className="text-emerald-700 dark:text-emerald-400">
          Wins {winShare.toFixed(0)}%
        </span>
        {breakevenShare > 0 ? (
          <span className="font-medium text-muted-foreground">
            Flat {breakevenShare.toFixed(0)}%
          </span>
        ) : null}
        <span className="text-rose-700 dark:text-rose-400">
          Losses {lossShare.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export function PnlBreakdownCard({ trades }: { trades: JournalTrade[] }) {
  const stats = useMemo(() => computePnlBreakdown(trades), [trades]);

  const totalTrades =
    stats.winCount + stats.lossCount + stats.breakevenCount;
  const hasTrades = totalTrades > 0;
  const winRate =
    totalTrades > 0 ? (stats.winCount / totalTrades) * 100 : 0;

  const winShare =
    totalTrades > 0 ? (stats.winCount / totalTrades) * 100 : 0;
  const lossShare =
    totalTrades > 0 ? (stats.lossCount / totalTrades) * 100 : 0;
  const breakevenShare =
    totalTrades > 0 ? (stats.breakevenCount / totalTrades) * 100 : 0;

  const emptyMessage = "No closed trades in this period";

  return (
    <Card className={cn(dashboardAnalyticsCardClass, "h-auto self-start")}>
      <CardHeader className={cn(dashboardAnalyticsHeaderClass, "pb-3")}>
        <CardTitle className={dashboardAnalyticsTitleClass}>
          P&L Breakdown
        </CardTitle>
        <CardDescription className={dashboardAnalyticsDescriptionClass}>
          Outcome split and trade extremes
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(dashboardAnalyticsContentClass, "space-y-3 pb-3")}>
        {!hasTrades ? (
          <div
            className={`flex ${dashboardChartBodyMinClass} items-center justify-center text-sm text-muted-foreground`}
          >
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              <OutcomeSpectrum
                winShare={winShare}
                lossShare={lossShare}
                breakevenShare={breakevenShare}
                winRate={winRate}
                netPnl={stats.netPnl}
                metricLabel="by trade count"
              />

              <ul className="grid gap-1.5 sm:grid-cols-2">
                <LegendRow
                  color="bg-emerald-500"
                  label="Winners"
                  amount={formatMoney(stats.grossProfit, false)}
                  share={pct(stats.winCount, totalTrades)}
                  shareClassName="text-emerald-700 dark:text-emerald-400"
                  barPct={
                    totalTrades ? (stats.winCount / totalTrades) * 100 : 0
                  }
                  barClass="bg-emerald-500"
                />
                <LegendRow
                  color="bg-rose-500"
                  label="Losers"
                  amount={formatMoney(-stats.grossLoss, false)}
                  share={pct(stats.lossCount, totalTrades)}
                  shareClassName="text-rose-700 dark:text-rose-400"
                  barPct={
                    totalTrades ? (stats.lossCount / totalTrades) * 100 : 0
                  }
                  barClass="bg-rose-500"
                />
                {stats.breakevenCount > 0 ? (
                  <LegendRow
                    color="bg-slate-400"
                    label="Breakeven"
                    amount={formatMoney(0, false)}
                    share={pct(stats.breakevenCount, totalTrades)}
                    shareClassName="text-slate-700 dark:text-slate-300"
                    barPct={
                      totalTrades
                        ? (stats.breakevenCount / totalTrades) * 100
                        : 0
                    }
                    barClass="bg-slate-400"
                  />
                ) : null}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-1.5 border-t border-border pt-3 lg:grid-cols-4">
              <FooterStat
                label="Best trade"
                value={formatMoney(stats.largestWin)}
                sub={stats.bestTradeTicker}
                valueClass="text-emerald-600 dark:text-emerald-400"
              />
              <FooterStat
                label="Worst trade"
                value={formatMoney(stats.largestLoss)}
                sub={stats.worstTradeTicker}
                valueClass="text-rose-600 dark:text-rose-400"
              />
              <FooterStat
                label="Max win streak"
                value={String(stats.maxConsecutiveWins)}
              />
              <FooterStat
                label="Max loss streak"
                value={String(stats.maxConsecutiveLosses)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LegendRow({
  color,
  label,
  amount,
  share,
  shareClassName,
  barPct,
  barClass,
}: {
  color: string;
  label: string;
  amount: string;
  share: string;
  shareClassName?: string;
  barPct: number;
  barClass: string;
}) {
  return (
    <li className="rounded-md border border-border/80 bg-muted/20 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
          <span className={cn("size-1.5 shrink-0 rounded-full", color)} />
          {label}
        </span>
        <span
          className={cn(
            "shrink-0 text-xs font-semibold",
            NUMERIC_CLASS,
            shareClassName ?? "text-foreground"
          )}
        >
          {share}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className={cn("text-xs font-semibold text-foreground", NUMERIC_CLASS)}>
          {amount}
        </p>
        <div className="h-1 w-16 overflow-hidden rounded-full bg-muted sm:w-20">
          <div
            className={cn("h-full rounded-full", barClass)}
            style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }}
          />
        </div>
      </div>
    </li>
  );
}

function FooterStat({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/15 px-2 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0">
        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            NUMERIC_CLASS,
            valueClass ?? "text-foreground"
          )}
        >
          {value}
        </p>
        {sub ? (
          <p className="text-[11px] font-medium text-muted-foreground">
            {sub}
          </p>
        ) : null}
      </div>
    </div>
  );
}
