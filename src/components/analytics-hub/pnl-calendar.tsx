"use client";

import { useMemo } from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  computeDailyPnl,
  formatMoney,
  type DailyPnlPoint,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type PnlLineChartProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

type CumulativePoint = DailyPnlPoint & {
  label: string;
  cumulative: number;
};

const chartConfig = {
  cumulative: { label: "Cumulative P&L", color: "var(--chart-2)" },
} satisfies ChartConfig;

function paddedDomain(values: number[]): [number, number] {
  if (values.length === 0) return [-1, 1];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(max - min, 1);
  const pad = Math.max(span * 0.15, 1);
  return [min - pad, max + pad];
}

function buildCumulativeLine(daily: DailyPnlPoint[]): CumulativePoint[] {
  if (daily.length === 0) return [];

  let running = 0;
  const points = daily.map((day) => {
    running += day.pnl;
    return {
      ...day,
      label: format(parseISO(day.date), "MMM d"),
      cumulative: Math.round(running * 100) / 100,
    };
  });

  if (points.length === 1) {
    const firstDate = parseISO(points[0].date);
    return [
      {
        date: format(subDays(firstDate, 1), "yyyy-MM-dd"),
        pnl: 0,
        trades: 0,
        label: format(subDays(firstDate, 1), "MMM d"),
        cumulative: 0,
      },
      ...points,
    ];
  }

  return points;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center bg-card px-3 py-2.5 sm:px-4">
      <p className="w-full text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 w-full text-center text-base font-semibold sm:text-[15px]",
          NUMERIC_CLASS,
          tone === "profit" && "text-emerald-600 dark:text-emerald-400",
          tone === "loss" && "text-rose-600 dark:text-rose-400",
          tone === "neutral" && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PnlLineChart({ trades, currency }: PnlLineChartProps) {
  const daily = useMemo(() => computeDailyPnl(trades), [trades]);
  const lineData = useMemo(() => buildCumulativeLine(daily), [daily]);

  const summary = useMemo(() => {
    if (daily.length === 0) return null;
    const netPnl = daily.reduce((sum, day) => sum + day.pnl, 0);
    const best = daily.reduce((a, b) => (b.pnl > a.pnl ? b : a));
    const worst = daily.reduce((a, b) => (b.pnl < a.pnl ? b : a));
    return {
      count: daily.length,
      netPnl: Math.round(netPnl * 100) / 100,
      best,
      worst,
    };
  }, [daily]);

  const yDomain = useMemo(
    () => paddedDomain(lineData.map((point) => point.cumulative)),
    [lineData]
  );

  const lineColor =
    (summary?.netPnl ?? 0) >= 0 ? "#10b981" : "#f43f5e";

  return (
    <DataPanel
      title="P&L line chart"
      subtitle="Cumulative realized P&L from closed trades"
      meta={summary ? `${summary.count} active days` : "No activity"}
      footer={
        summary
          ? `Best day ${formatMoney(summary.best.pnl, true, currency)} on ${format(parseISO(summary.best.date), "MMM d")} · Worst day ${formatMoney(summary.worst.pnl, true, currency)} on ${format(parseISO(summary.worst.date), "MMM d")}.`
          : undefined
      }
    >
      {!summary ? (
        <PanelEmpty
          title="No closed trades to chart"
          hint="The line appears once trades are closed within the selected period."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-lg border-2 border-border bg-border/70 sm:grid-cols-4">
            <Stat
              label="Net P&L"
              value={formatMoney(summary.netPnl, true, currency)}
              tone={
                summary.netPnl > 0
                  ? "profit"
                  : summary.netPnl < 0
                    ? "loss"
                    : "neutral"
              }
            />
            <Stat
              label="Active days"
              value={String(summary.count)}
              tone="neutral"
            />
            <Stat
              label="Best day"
              value={formatMoney(summary.best.pnl, true, currency)}
              tone={summary.best.pnl >= 0 ? "profit" : "loss"}
            />
            <Stat
              label="Worst day"
              value={formatMoney(summary.worst.pnl, true, currency)}
              tone={summary.worst.pnl >= 0 ? "profit" : "loss"}
            />
          </div>

          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <LineChart
              data={lineData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
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
                tickMargin={8}
                minTickGap={24}
                className="text-[10px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={52}
                domain={yDomain}
                tickCount={5}
                tickFormatter={(value) =>
                  formatMoney(Number(value), false, currency)
                }
                className="text-[10px]"
              />
              <ReferenceLine y={0} className="stroke-border" strokeWidth={1} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | { date?: string }
                        | undefined;
                      if (!row?.date) return "";
                      return format(parseISO(row.date), "MMM d, yyyy");
                    }}
                    formatter={(value, _name, item) => {
                      const row = item?.payload as
                        | { pnl?: number; trades?: number }
                        | undefined;
                      return (
                        <div className="space-y-0.5">
                          <div>
                            Cumulative:{" "}
                            {formatMoney(Number(value), true, currency)}
                          </div>
                          <div>
                            Day P&L:{" "}
                            {formatMoney(row?.pnl ?? 0, true, currency)}
                          </div>
                          <div>
                            Trades: {row?.trades ?? 0}
                          </div>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 3, fill: lineColor }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </DataPanel>
  );
}