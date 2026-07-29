"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EquityPoint } from "@/lib/dashboard-types";

const emptyEquity: EquityPoint[] = [];
const emptyAssetDistribution: { name: string; value: number; fill: string }[] =
  [];

const TIMEFRAME_LABELS: Record<string, string> = {
  "this-month": "THIS MONTH",
  ytd: "YTD",
  all: "ALL TIME",
};

const equityConfig = {
  equity: {
    label: "Equity",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const assetConfig = {
  Stocks: { label: "Stocks", color: "var(--chart-1)" },
  Forex: { label: "Forex", color: "var(--chart-2)" },
  Crypto: { label: "Crypto", color: "var(--chart-3)" },
  Options: { label: "Options", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function ChartsSection() {
  const [chartTimeframe, setChartTimeframe] = useState("ytd");

  const equityData: EquityPoint[] = useMemo(() => emptyEquity, [chartTimeframe]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>P&L Growth</CardTitle>
            <CardDescription>
              Cumulative account equity over time
            </CardDescription>
          </div>
          <Select
            value={chartTimeframe}
            onValueChange={(value) => {
              if (value) setChartTimeframe(value);
            }}
          >
            <SelectTrigger className="w-[150px] border-border bg-background uppercase">
              <SelectValue>
                {(value) =>
                  TIMEFRAME_LABELS[String(value ?? "")] ?? String(value ?? "")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">THIS MONTH</SelectItem>
              <SelectItem value="ytd">YTD</SelectItem>
              <SelectItem value="all">ALL TIME</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {equityData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Log trades in your journal to see equity growth.
            </div>
          ) : (
          <ChartContainer config={equityConfig} className="h-[280px] w-full">
            <AreaChart data={equityData} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-equity)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-equity)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      `$${Number(value).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}`
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="var(--color-equity)"
                fill="url(#equityFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Asset Distribution</CardTitle>
          <CardDescription>
            Trade volume breakdown by asset class
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emptyAssetDistribution.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              No asset breakdown yet — add trades to populate this chart.
            </div>
          ) : (
            <>
          <ChartContainer
            config={assetConfig}
            className="mx-auto h-[240px] w-full"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="name" hideLabel />}
              />
              <Pie
                data={emptyAssetDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                strokeWidth={2}
              />
              <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
                className="-translate-y-1"
              />
            </PieChart>
          </ChartContainer>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {emptyAssetDistribution.map((item) => (
              <div
                key={item.name}
                className="rounded-lg border border-border bg-background/60 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: item.fill }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold">{item.value}%</p>
              </div>
            ))}
          </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
