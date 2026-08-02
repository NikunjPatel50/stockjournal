"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  computeRMultipleBuckets,
  formatPercent,
  tradeRMultiple,
} from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type RMultipleSpectrumProps = {
  trades: JournalTrade[];
};

const chartConfig = {
  count: {
    label: "Trades",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

/** Loss buckets read red, the 0–1R bucket reads neutral, gains read green. */
const BAR_STYLES = [
  { fill: "var(--chart-4)", opacity: 1 },
  { fill: "var(--chart-4)", opacity: 0.75 },
  { fill: "var(--chart-4)", opacity: 0.5 },
  { fill: "var(--muted-foreground)", opacity: 0.35 },
  { fill: "var(--chart-1)", opacity: 0.5 },
  { fill: "var(--chart-1)", opacity: 0.75 },
  { fill: "var(--chart-1)", opacity: 1 },
] as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 truncate text-base font-semibold", NUMERIC_CLASS)}>
        {value}
      </p>
    </div>
  );
}

export function RMultipleSpectrum({ trades }: RMultipleSpectrumProps) {
  const buckets = useMemo(() => computeRMultipleBuckets(trades), [trades]);

  const rValues = useMemo(
    () =>
      trades
        .map(tradeRMultiple)
        .filter((value): value is number => value !== null),
    [trades]
  );

  const total = rValues.length;
  const avgR = total
    ? rValues.reduce((sum, value) => sum + value, 0) / total
    : 0;
  const atLeastOneR = rValues.filter((value) => value >= 1).length;
  const coverage = trades.length ? (total / trades.length) * 100 : 0;

  return (
    <DataPanel
      title="R-multiple distribution"
      subtitle="Outcome sizing relative to the risk planned on each trade"
      meta={`${total} of ${trades.length} priced`}
      footer={`Risk-plan coverage ${formatPercent(coverage)} — trades without planned risk are excluded.`}
    >
      {total === 0 ? (
        <PanelEmpty
          title="No risk-defined trades"
          hint="Record planned risk when logging a trade to see outcomes expressed in R."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Average" value={`${avgR.toFixed(2)}R`} />
            <Stat
              label="1R or better"
              value={formatPercent((atLeastOneR / total) * 100)}
            />
            <Stat
              label="Best"
              value={`${Math.max(...rValues).toFixed(2)}R`}
            />
          </div>

          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart
              data={buckets}
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
                tickMargin={8}
                className="text-[9px]"
                interval={0}
                angle={-20}
                textAnchor="end"
                height={46}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={28}
                className="text-[10px]"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {buckets.map((bucket, index) => {
                  const style = BAR_STYLES[index] ?? BAR_STYLES.at(-1)!;
                  return (
                    <Cell
                      key={bucket.label}
                      fill={style.fill}
                      fillOpacity={style.opacity}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </DataPanel>
  );
}
