"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  computeMonthlyPerformanceForYear,
  formatSignedPercent,
  getAnalyticsYears,
} from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const chartConfig = {
  returnPct: { label: "Return", color: "#10b981" },
} satisfies ChartConfig;

function yDomain(values: number[]): [number, number] {
  if (values.every((v) => v === 0)) return [-10, 10];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(max - min, 4);
  const pad = span * 0.15;
  return [min - pad, max + pad];
}

export function MonthlyPerformanceCard({
  trades,
  startingEquity,
}: {
  trades: JournalTrade[];
  startingEquity: number;
}) {
  const yearOptions = useMemo(() => getAnalyticsYears(trades), [trades]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  useEffect(() => {
    if (!yearOptions.includes(year)) {
      setYear(yearOptions[0] ?? new Date().getFullYear());
    }
  }, [year, yearOptions]);

  const months = useMemo(
    () => computeMonthlyPerformanceForYear(trades, startingEquity, year),
    [trades, startingEquity, year]
  );

  useEffect(() => {
    setSelectedMonthKey((prev) => {
      if (prev && months.some((m) => m.monthKey === prev)) return prev;
      return months[months.length - 1]?.monthKey ?? null;
    });
  }, [months, year]);

  const selectedMonth = useMemo(() => {
    if (!months.length) return undefined;
    if (selectedMonthKey) {
      const hit = months.find((m) => m.monthKey === selectedMonthKey);
      if (hit) return hit;
    }
    return months[months.length - 1];
  }, [months, selectedMonthKey]);

  const domain = useMemo(
    () => yDomain(months.map((m) => m.returnPct)),
    [months]
  );

  const latest = months[months.length - 1];
  const display = selectedMonth ?? latest;
  const displayUp = (display?.returnPct ?? 0) > 0;
  const displayDown = (display?.returnPct ?? 0) < 0;

  return (
    <Card className="h-full border-border bg-card shadow-none">
      <CardHeader className="border-b border-border py-3 pb-3">
        <CardTitle className="text-base font-semibold">
          Monthly Performance
        </CardTitle>
        <CardAction>
          <Select
            value={String(year)}
            onValueChange={(v) => v && setYear(Number(v))}
          >
            <SelectTrigger className="h-8 w-[5.25rem] border-border bg-background px-2 font-normal shadow-none">
              <span className={cn("text-sm font-medium", NUMERIC_CLASS)}>{year}</span>
            </SelectTrigger>
            <SelectContent align="end">
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={months} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fontSize: 10 }}
              domain={domain}
              tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
            <Bar
              dataKey="returnPct"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
              cursor="pointer"
              onClick={(entry) => {
                const row = entry?.payload as (typeof months)[number] | undefined;
                if (row?.monthKey) setSelectedMonthKey(row.monthKey);
              }}
            >
              {months.map((m) => {
                const isSelected = display?.monthKey === m.monthKey;
                return (
                  <Cell
                    key={m.monthKey}
                    fill={m.returnPct >= 0 ? "#10b981" : "#f43f5e"}
                    fillOpacity={isSelected ? 1 : 0.4}
                    stroke={isSelected ? (m.returnPct >= 0 ? "#059669" : "#e11d48") : "none"}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ChartContainer>

        {display ? (
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{display.monthTitle}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold",
                NUMERIC_CLASS,
                displayUp && "text-emerald-600 dark:text-emerald-400",
                displayDown && "text-rose-600 dark:text-rose-400",
                !displayUp && !displayDown && "text-foreground"
              )}
            >
              {formatSignedPercent(display.returnPct, 2)}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
