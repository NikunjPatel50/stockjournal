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
import { formatPercent, tradeRMultiple } from "@/lib/analytics";
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

const BAR_STYLES = [
  { fill: "var(--chart-4)", opacity: 1 },
  { fill: "var(--muted-foreground)", opacity: 0.45 },
  { fill: "var(--chart-1)", opacity: 1 },
] as const;

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

export function RMultipleSpectrum({ trades }: RMultipleSpectrumProps) {
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
  const targetHits = rValues.filter((value) => value >= 1).length;
  const skipped = trades.length - total;

  const buckets = useMemo(
    () => [
      {
        label: "Losses",
        count: rValues.filter((value) => value < 0).length,
      },
      {
        label: "Small wins",
        count: rValues.filter((value) => value >= 0 && value < 1).length,
      },
      {
        label: "Target hit",
        count: rValues.filter((value) => value >= 1).length,
      },
    ],
    [rValues]
  );

  return (
    <DataPanel
      title="Results vs risk"
      subtitle="How trades performed against the risk you planned"
      meta={`${total} trades`}
      footer={
        skipped > 0
          ? `${skipped} trade${skipped === 1 ? "" : "s"} skipped — add planned risk when logging to include them.`
          : undefined
      }
    >
      {total === 0 ? (
        <PanelEmpty
          title="No trades with planned risk"
          hint="Set planned risk on a trade to see whether you lost, won small, or hit your target."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat
              label="Typical result"
              value={`${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}× risk`}
              hint="Average return per unit of risk taken"
            />
            <Stat
              label="Hit target"
              value={formatPercent((targetHits / total) * 100)}
              hint="Trades that reached 1× your planned risk or more"
            />
          </div>

          <ChartContainer config={chartConfig} className="h-[180px] w-full">
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
                tickMargin={10}
                className="text-[11px]"
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
