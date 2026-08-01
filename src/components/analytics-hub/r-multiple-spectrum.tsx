"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { HubPanel } from "@/components/analytics-hub/hub-panel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { computeRMultipleBuckets } from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";

type RMultipleSpectrumProps = {
  trades: JournalTrade[];
};

const chartConfig = {
  count: {
    label: "Trades",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const BAR_COLORS = [
  "hsl(var(--chart-5))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-1))",
];

export function RMultipleSpectrum({ trades }: RMultipleSpectrumProps) {
  const buckets = useMemo(() => computeRMultipleBuckets(trades), [trades]);
  const withRisk = useMemo(
    () => trades.filter((t) => t.plannedRisk > 0).length,
    [trades]
  );
  const total = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <HubPanel
      title="R-multiple distribution"
      subtitle={`${withRisk} trades with planned risk defined`}
      accent="violet"
    >
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Add planned risk on trades to see R-multiple buckets.
        </p>
      ) : (
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-[9px]"
              interval={0}
              angle={-20}
              textAnchor="end"
              height={48}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={28}
              className="text-[10px]"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {buckets.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i] ?? BAR_COLORS.at(-1)!} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </HubPanel>
  );
}
