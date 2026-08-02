"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
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
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "loss" | "neutral";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-base font-semibold",
          NUMERIC_CLASS,
          tone === "loss"
            ? "text-rose-600 dark:text-rose-400"
            : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function DrawdownUnderwater({ equity }: DrawdownUnderwaterProps) {
  const data = useMemo(
    () =>
      equity.map((point) => ({
        ...point,
        label: format(parseISO(point.date), "MMM d"),
      })),
    [equity]
  );

  const maxDrawdown = useMemo(
    () => (equity.length ? Math.min(...equity.map((p) => p.drawdownPct)) : 0),
    [equity]
  );
  const currentDrawdown = equity.at(-1)?.drawdownPct ?? 0;
  const underwaterPoints = equity.filter((p) => p.drawdownPct < 0).length;

  return (
    <DataPanel
      title="Underwater curve"
      subtitle="Distance below the equity high-water mark after each trade"
      meta={`${Math.max(0, equity.length - 1)} points`}
      footer="Measured against peak equity; zero means the account is at a new high."
    >
      {data.length < 2 ? (
        <PanelEmpty
          title="Not enough equity points"
          hint="At least two closed trades are needed to plot a drawdown path."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Stat
              label="Max drawdown"
              value={formatPercent(maxDrawdown, 2)}
              tone="loss"
            />
            <Stat
              label="Current"
              value={formatPercent(currentDrawdown, 2)}
              tone={currentDrawdown < 0 ? "loss" : "neutral"}
            />
            <Stat
              label="Underwater"
              value={`${underwaterPoints} of ${equity.length}`}
            />
          </div>

          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-drawdownPct)"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-drawdownPct)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
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
                minTickGap={32}
                className="text-[10px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={44}
                tickFormatter={(value) => `${value}%`}
                className="text-[10px]"
              />
              <ReferenceLine y={0} className="stroke-border" strokeWidth={1} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatPercent(Number(value), 2)}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="drawdownPct"
                stroke="var(--color-drawdownPct)"
                fill="url(#ddFill)"
                strokeWidth={1.75}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
    </DataPanel>
  );
}
