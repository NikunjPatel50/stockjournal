"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  computeWeekdayWinLoss,
  formatPercent,
  type WeekdayWinLossPoint,
} from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type WeekdayWinLossCardProps = {
  trades: JournalTrade[];
};

const chartConfig = {
  winPct: {
    label: "Wins",
    color: "var(--chart-1)",
  },
  lossPct: {
    label: "Losses",
    color: "var(--chart-4)",
  },
  breakevenPct: {
    label: "Breakeven",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 truncate text-lg font-semibold", NUMERIC_CLASS)}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function summarizeWeekdays(points: WeekdayWinLossPoint[]) {
  const active = points.filter((point) => point.total > 0);
  const totalTrades = active.reduce((sum, point) => sum + point.total, 0);
  const totalWins = active.reduce((sum, point) => sum + point.wins, 0);
  const avgWinRate = totalTrades ? (totalWins / totalTrades) * 100 : 0;

  const bestDay = active.reduce<WeekdayWinLossPoint | null>((best, point) => {
    if (!best || point.winPct > best.winPct) return point;
    if (point.winPct === best.winPct && point.total > best.total) return point;
    return best;
  }, null);

  const weakestDay = active.reduce<WeekdayWinLossPoint | null>((worst, point) => {
    if (!worst || point.winPct < worst.winPct) return point;
    if (point.winPct === worst.winPct && point.total > worst.total) return point;
    return worst;
  }, null);

  return { totalTrades, avgWinRate, bestDay, weakestDay };
}

export function WeekdayWinLossCard({ trades }: WeekdayWinLossCardProps) {
  const points = useMemo(() => computeWeekdayWinLoss(trades), [trades]);
  const { totalTrades, avgWinRate, bestDay, weakestDay } = useMemo(
    () => summarizeWeekdays(points),
    [points]
  );

  const chartData = useMemo(
    () =>
      points.map((point) => ({
        ...point,
        label: point.day,
      })),
    [points]
  );

  return (
    <DataPanel
      title="Win rate by weekday"
      subtitle="Share of winning vs losing trades closed each day"
      meta={`${totalTrades} trades`}
      footer={
        totalTrades > 0
          ? "Weekends are excluded. Each trade is grouped by its close date."
          : undefined
      }
    >
      {totalTrades === 0 ? (
        <PanelEmpty
          title="No weekday trades yet"
          hint="Close trades Monday through Friday to see how your win rate varies by day."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat
              label="Best day"
              value={
                bestDay
                  ? `${bestDay.day} · ${formatPercent(bestDay.winPct)}`
                  : "—"
              }
              hint={
                bestDay
                  ? `${bestDay.wins}W / ${bestDay.losses}L across ${bestDay.total} trades`
                  : undefined
              }
            />
            <Stat
              label="Avg win rate"
              value={formatPercent(avgWinRate)}
              hint={
                weakestDay && weakestDay.day !== bestDay?.day
                  ? `Lowest: ${weakestDay.day} at ${formatPercent(weakestDay.winPct)}`
                  : "Across all Mon–Fri closes"
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[var(--chart-1)]" aria-hidden />
              Wins
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[var(--chart-4)]" aria-hidden />
              Losses
            </span>
            {points.some((point) => point.breakeven > 0) ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-sm bg-muted-foreground/45"
                  aria-hidden
                />
                Breakeven
              </span>
            ) : null}
          </div>

          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="2 4"
                className="stroke-border/60"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                className="text-[11px]"
              />
              <YAxis
                domain={[0, 100]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(value) => `${value}%`}
                className="text-[10px]"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => {
                      const row = item?.payload as WeekdayWinLossPoint | undefined;
                      if (!row || row.total === 0) {
                        return ["No trades", name];
                      }
                      if (name === "winPct") {
                        return [
                          `${row.wins} wins (${formatPercent(Number(value))})`,
                          "Wins",
                        ];
                      }
                      if (name === "lossPct") {
                        return [
                          `${row.losses} losses (${formatPercent(Number(value))})`,
                          "Losses",
                        ];
                      }
                      return [
                        `${row.breakeven} breakeven (${formatPercent(Number(value))})`,
                        "Breakeven",
                      ];
                    }}
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload as
                        | WeekdayWinLossPoint
                        | undefined;
                      if (!row || row.total === 0) {
                        return `${label} · no trades`;
                      }
                      return `${label} · ${row.total} trades`;
                    }}
                  />
                }
              />
              <Bar
                dataKey="winPct"
                stackId="weekday"
                fill="var(--color-winPct)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="breakevenPct"
                stackId="weekday"
                fill="var(--color-breakevenPct)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="lossPct"
                stackId="weekday"
                fill="var(--color-lossPct)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </DataPanel>
  );
}
