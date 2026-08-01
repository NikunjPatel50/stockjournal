"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { HubPanel } from "@/components/analytics-hub/hub-panel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPercent, type EquityPoint } from "@/lib/analytics";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type DrawdownUnderwaterProps = {
  equity: EquityPoint[];
};

const chartConfig = {
  drawdownPct: {
    label: "Drawdown",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function DrawdownUnderwater({ equity }: DrawdownUnderwaterProps) {
  const data = useMemo(
    () =>
      equity.map((p) => ({
        ...p,
        label: format(parseISO(p.date), "MMM d"),
      })),
    [equity]
  );

  const maxDd = useMemo(
    () =>
      equity.length
        ? Math.min(...equity.map((p) => p.drawdownPct))
        : 0,
    [equity]
  );

  const peakRecovery = equity.length > 1 ? equity.length - 1 : 0;

  return (
    <HubPanel
      title="Underwater curve"
      subtitle="How far equity fell from peak over time"
      accent="violet"
    >
      {data.length < 2 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Need more closed trades to plot drawdown.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p
              className={cn(
                "text-2xl font-semibold text-rose-600 dark:text-rose-400",
                NUMERIC_CLASS
              )}
            >
              {formatPercent(maxDd)}
            </p>
            <p className="text-xs text-muted-foreground">
              Deepest dip · {peakRecovery} trade points
            </p>
          </div>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-drawdownPct)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-drawdownPct)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                className="text-[10px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={40}
                tickFormatter={(v) => `${v}%`}
                className="text-[10px]"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatPercent(Number(value))}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="drawdownPct"
                stroke="var(--color-drawdownPct)"
                fill="url(#ddFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </>
      )}
    </HubPanel>
  );
}
