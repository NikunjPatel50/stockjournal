"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import { DataPanel } from "@/components/data-panel";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CurrencyCode } from "@/lib/settings";
import {
  formatMoney,
  formatPercent,
  type MacroSummaryMonthRow,
} from "@/lib/analytics";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

type MacroSummaryTableProps = {
  rows: MacroSummaryMonthRow[];
  currency: CurrencyCode;
  year: number;
};

type ChartPoint = {
  month: string;
  fullLabel: string;
  pnl: number;
  trades: number;
  hasTrades: boolean;
  winPct: number | null;
  totalGain: number | null;
  totalLoss: number | null;
  biggestGain: number | null;
  biggestLoss: number | null;
};

const chartConfig = {
  pnl: { label: "P&L", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

function pnlTone(value: number | null | undefined) {
  if (value == null || value === 0) return "neutral" as const;
  return value > 0 ? ("profit" as const) : ("loss" as const);
}

function toneTextClass(tone: ReturnType<typeof pnlTone>) {
  if (tone === "profit") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "loss") return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}

function moneyValue(
  value: number | null,
  currency: CurrencyCode,
  withSign = true
) {
  if (value == null) return "—";
  return formatMoney(value, withSign, currency);
}

function monthShort(label: string) {
  return label.slice(0, 3);
}

function yDomain(values: number[]): [number, number] {
  if (values.length === 0) return [-100, 100];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(max - min, 1);
  const pad = Math.max(span * 0.25, 1);
  return [min - pad, max + pad];
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
      <span
        className={cn(
          "font-medium tabular-nums text-foreground",
          NUMERIC_DISPLAY_CLASS,
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  );
}

function MacroTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartPoint }>;
  currency: CurrencyCode;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  if (!row.hasTrades) {
    return (
      <div className="z-50 min-w-[12rem] rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-md">
        <p className="font-semibold text-foreground">{row.fullLabel}</p>
        <p className="mt-1 text-muted-foreground">No closed trades this month</p>
      </div>
    );
  }

  return (
    <div className="z-50 min-w-[13.5rem] rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-foreground">{row.fullLabel}</p>
      <div className="mt-2 space-y-1">
        <TooltipStatRow
          label="P&L"
          value={moneyValue(row.pnl, currency)}
          valueClassName={toneTextClass(pnlTone(row.pnl))}
        />
        <TooltipStatRow
          label="Trades"
          value={String(row.trades)}
        />
        <TooltipStatRow
          label="Win rate"
          value={row.winPct != null ? formatPercent(row.winPct) : "—"}
          valueClassName={
            row.winPct != null && row.winPct >= 50
              ? "text-emerald-600 dark:text-emerald-400"
              : undefined
          }
        />
        <TooltipStatRow
          label="Total gain"
          value={moneyValue(row.totalGain, currency)}
          valueClassName={toneTextClass(pnlTone(row.totalGain))}
        />
        <TooltipStatRow
          label="Total loss"
          value={moneyValue(row.totalLoss, currency)}
          valueClassName={toneTextClass(pnlTone(row.totalLoss))}
        />
        <TooltipStatRow
          label="Biggest gain"
          value={moneyValue(row.biggestGain, currency)}
          valueClassName={toneTextClass(pnlTone(row.biggestGain))}
        />
        <TooltipStatRow
          label="Biggest loss"
          value={moneyValue(row.biggestLoss, currency)}
          valueClassName={toneTextClass(pnlTone(row.biggestLoss))}
        />
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: ReturnType<typeof pnlTone>;
}) {
  return (
    <div className="rounded-md border-2 border-border bg-muted/20 px-3 py-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          NUMERIC_DISPLAY_CLASS,
          toneTextClass(tone)
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function MacroSummaryTable({ rows, currency, year }: MacroSummaryTableProps) {
  const yearStats = useMemo(() => {
    const activeRows = rows.filter((row) => row.trades > 0);
    const totalTrades = activeRows.reduce((sum, row) => sum + row.trades, 0);
    const totalPnl = activeRows.reduce((sum, row) => sum + (row.pnl ?? 0), 0);
    const winWeighted =
      totalTrades > 0
        ? activeRows.reduce(
            (sum, row) => sum + (row.winPct ?? 0) * row.trades,
            0
          ) / totalTrades
        : null;
    const activeMonths = activeRows.length;
    const avgPnlPerTrade =
      totalTrades > 0
        ? Math.round((totalPnl / totalTrades) * 100) / 100
        : null;

    let bestMonth: MacroSummaryMonthRow | null = null;
    let worstMonth: MacroSummaryMonthRow | null = null;
    for (const row of activeRows) {
      if (row.pnl == null) continue;
      if (!bestMonth || row.pnl > (bestMonth.pnl ?? 0)) bestMonth = row;
      if (!worstMonth || row.pnl < (worstMonth.pnl ?? 0)) worstMonth = row;
    }

    return {
      totalTrades,
      totalPnl: Math.round(totalPnl * 100) / 100,
      winWeighted:
        winWeighted != null ? Math.round(winWeighted * 10) / 10 : null,
      activeMonths,
      avgPnlPerTrade,
      bestMonth,
      worstMonth,
    };
  }, [rows]);

  const chartData = useMemo<ChartPoint[]>(
    () =>
      rows.map((row) => ({
        month: monthShort(row.label),
        fullLabel: row.label,
        pnl: row.pnl ?? 0,
        trades: row.trades,
        hasTrades: row.trades > 0,
        winPct: row.winPct,
        totalGain: row.totalGain,
        totalLoss: row.totalLoss,
        biggestGain: row.biggestGain,
        biggestLoss: row.biggestLoss,
      })),
    [rows]
  );

  const pnlValues = chartData.filter((point) => point.hasTrades).map((point) => point.pnl);

  return (
    <DataPanel
      title="Year overview"
      subtitle={`Monthly performance breakdown for ${year}`}
      meta={`${yearStats.activeMonths} active month${yearStats.activeMonths === 1 ? "" : "s"}`}
      flush
    >
      <div className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile
            label="Year P&L"
            value={moneyValue(yearStats.totalPnl, currency)}
            tone={pnlTone(yearStats.totalPnl)}
          />
          <StatTile
            label="Total trades"
            value={yearStats.totalTrades > 0 ? String(yearStats.totalTrades) : "—"}
          />
          <StatTile
            label="Avg win rate"
            value={
              yearStats.winWeighted != null
                ? formatPercent(yearStats.winWeighted)
                : "—"
            }
            tone={
              yearStats.winWeighted != null && yearStats.winWeighted >= 50
                ? "profit"
                : "neutral"
            }
          />
          <StatTile
            label="Active months"
            value={`${yearStats.activeMonths} / 12`}
          />
          <StatTile
            label="Avg per trade"
            value={
              yearStats.avgPnlPerTrade != null
                ? moneyValue(yearStats.avgPnlPerTrade, currency)
                : "—"
            }
            tone={pnlTone(yearStats.avgPnlPerTrade)}
          />
          <StatTile
            label="Best / worst"
            value={
              yearStats.bestMonth && yearStats.worstMonth
                ? `${monthShort(yearStats.bestMonth.label)} / ${monthShort(yearStats.worstMonth.label)}`
                : "—"
            }
          />
        </div>

        <ChartContainer config={chartConfig} className="aspect-auto h-[11rem] w-full">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-[10px] fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(value: number) =>
                formatMoney(value, true, currency).replace(/\.00$/, "")
              }
              domain={yDomain(pnlValues)}
              className="text-[10px] fill-muted-foreground"
            />
            <ReferenceLine y={0} className="stroke-border" />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
              content={<MacroTooltip currency={currency} />}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {chartData.map((point) => (
                <Cell
                  key={point.month}
                  fill={
                    point.pnl > 0
                      ? "#10b981"
                      : point.pnl < 0
                        ? "#f43f5e"
                        : "hsl(var(--muted-foreground) / 0.25)"
                  }
                  className={point.hasTrades ? "" : "opacity-30"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="grid w-full grid-cols-6 gap-1.5 sm:grid-cols-12">
          {rows.map((row) => {
            const tone = pnlTone(row.pnl);
            return (
              <div
                key={row.month}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center rounded-lg border-2 border-border bg-card px-1 py-2 text-center",
                  row.trades === 0 && "opacity-60"
                )}
              >
                <span className="text-[10px] font-bold tracking-wide text-muted-foreground">
                  {monthShort(row.label)}
                </span>
                <span
                  className={cn(
                    "mt-0.5 w-full truncate text-[10px] font-semibold sm:text-[11px]",
                    NUMERIC_DISPLAY_CLASS,
                    toneTextClass(tone)
                  )}
                >
                  {row.trades > 0 ? moneyValue(row.pnl, currency) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </DataPanel>
  );
}
