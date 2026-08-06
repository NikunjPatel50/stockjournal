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
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  computePerformanceForYear,
  formatMoney,
  formatSignedPercent,
  getAnalyticsYears,
  type MonthlyPerformancePoint,
  type PerformanceGranularity,
} from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";
import { formatSignedMoney } from "@/lib/journal-types";
import { useSettings } from "@/components/settings/settings-provider";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const chartConfig = {
  monthPnl: { label: "P&L", color: "#10b981" },
} satisfies ChartConfig;

const GRANULARITY_OPTIONS: { value: PerformanceGranularity; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
];

const GRANULARITY_TITLE: Record<PerformanceGranularity, string> = {
  monthly: "Monthly Performance",
  weekly: "Weekly Performance",
  daily: "Daily Performance",
};

function yDomain(values: number[]): [number, number] {
  if (values.length === 0) return [-100, 100];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(max - min, 1);
  const pad = Math.max(span * 0.2, 1);
  return [min - pad, max + pad];
}

function xAxisInterval(count: number, granularity: PerformanceGranularity): number {
  if (count <= 1) return 0;
  if (granularity === "monthly") return 0;
  if (granularity === "weekly") return Math.max(0, Math.ceil(count / 10) - 1);
  return Math.max(0, Math.ceil(count / 12) - 1);
}

function TooltipStatRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums text-foreground", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

function PerformancePeriodTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: MonthlyPerformancePoint }>;
  currency: "USD" | "EUR" | "GBP" | "INR" | "CAD";
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const s = row.stats;

  return (
    <div className="z-50 min-w-[12.5rem] rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-md">
      <p className="mb-2 font-semibold text-foreground">{row.monthTitle}</p>
      <div className="space-y-1">
        <TooltipStatRow
          label="P&L"
          value={formatSignedMoney(row.monthPnl, currency)}
          valueClassName={
            row.monthPnl > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : row.monthPnl < 0
                ? "text-rose-600 dark:text-rose-400"
                : undefined
          }
        />
        <TooltipStatRow
          label="Return"
          value={formatSignedPercent(row.returnPct, 2)}
        />
        <TooltipStatRow label="Trades" value={String(s.totalTrades)} />
        <TooltipStatRow
          label="Winners"
          value={String(s.winningTrades)}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <TooltipStatRow
          label="Losers"
          value={String(s.losingTrades)}
          valueClassName="text-rose-600 dark:text-rose-400"
        />
        <TooltipStatRow
          label="Accuracy"
          value={`${s.accuracyPct.toFixed(1)}%`}
        />
        <TooltipStatRow
          label="Total win"
          value={formatSignedMoney(s.totalWinAmount, currency)}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <TooltipStatRow
          label="Total loss"
          value={formatSignedMoney(-s.totalLossAmount, currency)}
          valueClassName="text-rose-600 dark:text-rose-400"
        />
        <TooltipStatRow label="Risk : reward" value={s.riskRewardLabel} />
      </div>
    </div>
  );
}

export function MonthlyPerformanceCard({
  trades,
  startingEquity,
}: {
  trades: JournalTrade[];
  startingEquity: number;
}) {
  const { settings } = useSettings();
  const currency = settings.profile.currency;
  const yearOptions = useMemo(() => getAnalyticsYears(trades), [trades]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [granularity, setGranularity] =
    useState<PerformanceGranularity>("monthly");
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!yearOptions.includes(year)) {
      setYear(yearOptions[0] ?? new Date().getFullYear());
    }
  }, [year, yearOptions]);

  const periods = useMemo(
    () =>
      computePerformanceForYear(
        trades,
        startingEquity,
        year,
        granularity
      ),
    [trades, startingEquity, year, granularity]
  );

  useEffect(() => {
    setSelectedPeriodKey((prev) => {
      if (prev && periods.some((p) => p.monthKey === prev)) return prev;
      return periods[periods.length - 1]?.monthKey ?? null;
    });
  }, [periods, year, granularity]);

  const selectedPeriod = useMemo(() => {
    if (!periods.length) return undefined;
    if (selectedPeriodKey) {
      const hit = periods.find((p) => p.monthKey === selectedPeriodKey);
      if (hit) return hit;
    }
    return periods[periods.length - 1];
  }, [periods, selectedPeriodKey]);

  const domain = useMemo(
    () => yDomain(periods.map((p) => p.monthPnl)),
    [periods]
  );

  const latest = periods[periods.length - 1];
  const display = selectedPeriod ?? latest;
  const displayUp = (display?.monthPnl ?? 0) > 0;
  const displayDown = (display?.monthPnl ?? 0) < 0;
  const tickInterval = xAxisInterval(periods.length, granularity);
  const maxBarSize =
    granularity === "daily" ? 8 : granularity === "weekly" ? 20 : 36;

  return (
    <Card className="h-full border-border bg-card shadow-none">
      <CardHeader className="border-b border-border py-3 pb-3 @max-[520px]/card-header:grid-cols-1 @max-[520px]/card-header:gap-3">
        <CardTitle className="text-base font-semibold">
          {GRANULARITY_TITLE[granularity]}
        </CardTitle>
        <CardAction className="@max-[520px]/card-header:col-start-1 @max-[520px]/card-header:row-start-2 @max-[520px]/card-header:justify-self-start">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={granularity}
              onValueChange={(v) =>
                v && setGranularity(v as PerformanceGranularity)
              }
            >
              <SelectTrigger className="h-8 w-[6.5rem] border-border bg-background px-2 font-normal shadow-none">
                <span className="text-sm font-medium">
                  {
                    GRANULARITY_OPTIONS.find((o) => o.value === granularity)
                      ?.label
                  }
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                {GRANULARITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(v) => v && setYear(Number(v))}
            >
              <SelectTrigger className="h-8 w-[5.25rem] border-border bg-background px-2 font-normal shadow-none">
                <span className={cn("text-sm font-medium", NUMERIC_CLASS)}>
                  {year}
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {periods.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 px-4 text-center text-sm text-muted-foreground">
            No closed trades in the selected year for this view.
          </div>
        ) : (
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart
            data={periods}
            margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval={tickInterval}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 10 }}
              domain={domain}
              tickFormatter={(v) => formatMoney(Number(v), false, currency)}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
              content={
                <PerformancePeriodTooltip currency={currency} />
              }
            />
            <Bar
              dataKey="monthPnl"
              radius={[4, 4, 0, 0]}
              maxBarSize={maxBarSize}
              cursor="pointer"
              onClick={(entry) => {
                const row = entry?.payload as (typeof periods)[number] | undefined;
                if (row?.monthKey) setSelectedPeriodKey(row.monthKey);
              }}
            >
              {periods.map((p) => {
                const isSelected = display?.monthKey === p.monthKey;
                return (
                  <Cell
                    key={p.monthKey}
                    fill={p.monthPnl >= 0 ? "#10b981" : "#f43f5e"}
                    fillOpacity={isSelected ? 1 : 0.4}
                    stroke={
                      isSelected
                        ? p.monthPnl >= 0
                          ? "#059669"
                          : "#e11d48"
                        : "none"
                    }
                    strokeWidth={isSelected ? 2 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ChartContainer>
        )}

        {display ? (
          <div className="rounded-lg border-2 border-border/70 bg-muted/20 px-4 py-3 text-center">
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
              {formatSignedMoney(display.monthPnl, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatSignedPercent(display.returnPct, 2)} return
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
