"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatPercent } from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";
import {
  computePerformanceBreakdown,
  type PerformanceBreakdownRow,
} from "@/lib/performance-breakdown";
import {
  fundamentalsCacheKeysForSymbols,
  readFundamentalsCache,
  writeFundamentalsCache,
} from "@/lib/fundamentals-cache";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import type { CurrencyCode } from "@/lib/settings";
import type { TickerFundamentals } from "@/lib/yahoo-fundamentals";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type PerformanceBreakdownCardsProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

const MAX_ROWS = 8;

const BAR_COLOR_POSITIVE = "#10b981";
const BAR_COLOR_NEGATIVE = "#f43f5e";

const PIE_SLICE_COLORS = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#ea580c",
  "#0d9488",
];

type PieShareLabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  payload?: { share?: number };
  percent?: number;
};

function renderPieShareLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  payload,
  percent = 0,
}: PieShareLabelProps) {
  const share = payload?.share ?? percent * 100;
  if (share < 3) return null;

  const radians = (Math.PI / 180) * -midAngle;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(radians);
  const y = cy + radius * Math.sin(radians);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="pointer-events-none text-[11px] font-semibold"
      stroke="rgba(15,23,42,0.45)"
      strokeWidth={2.5}
      paintOrder="stroke"
    >
      {`${Math.round(share)}%`}
    </text>
  );
}

function BreakdownPnlPieChart({
  rows,
  currency,
}: {
  rows: PerformanceBreakdownRow[];
  currency: CurrencyCode;
}) {
  const chartData = useMemo(() => {
    const totalAbs = rows.reduce(
      (sum, row) => sum + Math.abs(row.totalPnl),
      0
    );

    return rows.map((row, index) => ({
      name: row.label,
      value: totalAbs > 0 ? Math.abs(row.totalPnl) : 1,
      pnl: row.totalPnl,
      trades: row.trades,
      winRate: row.winRate,
      avgR: row.avgR,
      share:
        totalAbs > 0
          ? (Math.abs(row.totalPnl) / totalAbs) * 100
          : 100 / rows.length,
      fill: PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length],
    }));
  }, [rows]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const row of chartData) {
      config[row.name] = { label: row.name, color: row.fill };
    }
    return config;
  }, [chartData]);

  return (
    <ChartContainer
      config={chartConfig}
      initialDimension={{ width: 220, height: 220 }}
      className="mx-auto h-[220px] w-full"
    >
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="name"
              hideLabel
              formatter={(_value, _name, item) => {
                const row = item?.payload as
                  | {
                      name?: string;
                      pnl?: number;
                      trades?: number;
                      winRate?: number;
                      avgR?: number | null;
                      share?: number;
                    }
                  | undefined;
                if (!row) return null;
                return (
                  <div className="space-y-0.5 text-xs">
                    <div className="font-medium">{row.name}</div>
                    <div>
                      Net P&L: {formatMoney(row.pnl ?? 0, true, currency)}
                    </div>
                    <div>Share: {formatPercent(row.share ?? 0)}</div>
                    <div>Trades: {row.trades ?? 0}</div>
                    <div>Win rate: {formatPercent(row.winRate ?? 0)}</div>
                    <div>
                      Avg R:{" "}
                      {row.avgR != null ? `${row.avgR.toFixed(2)}R` : "—"}
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={82}
          strokeWidth={2}
          paddingAngle={chartData.length > 1 ? 2 : 0}
          isAnimationActive={false}
          label={renderPieShareLabel}
          labelLine={false}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          className="-translate-y-1 flex-wrap gap-2"
        />
      </PieChart>
    </ChartContainer>
  );
}

function BreakdownPnlBarChart({
  rows,
  currency,
}: {
  rows: PerformanceBreakdownRow[];
  currency: CurrencyCode;
}) {
  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => a.totalPnl - b.totalPnl)
        .map((row) => ({
          name: row.label,
          pnl: row.totalPnl,
          trades: row.trades,
          winRate: row.winRate,
          avgR: row.avgR,
          fill: row.totalPnl >= 0 ? BAR_COLOR_POSITIVE : BAR_COLOR_NEGATIVE,
        })),
    [rows]
  );

  const chartConfig = useMemo(
    () =>
      ({
        pnl: { label: "Net P&L", color: "var(--chart-2)" },
      }) satisfies ChartConfig,
    []
  );

  const chartHeight = Math.min(200, Math.max(96, chartData.length * 34 + 16));
  const labelWidth = Math.min(
    132,
    Math.max(72, ...chartData.map((row) => row.name.length * 6.5))
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: chartHeight }}
    >
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        barCategoryGap="20%"
      >
        <CartesianGrid
          horizontal={false}
          strokeDasharray="3 3"
          className="stroke-border/50"
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tick={{ fontSize: 10 }}
          tickFormatter={(value) =>
            formatMoney(Number(value), false, currency)
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={labelWidth}
          tick={{ fontSize: 10 }}
        />
        <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(_value, _name, item) => {
                const row = item?.payload as
                  | {
                      name?: string;
                      pnl?: number;
                      trades?: number;
                      winRate?: number;
                      avgR?: number | null;
                    }
                  | undefined;
                if (!row) return null;
                return (
                  <div className="space-y-0.5 text-xs">
                    <div className="font-medium">{row.name}</div>
                    <div>
                      Net P&L: {formatMoney(row.pnl ?? 0, true, currency)}
                    </div>
                    <div>Trades: {row.trades ?? 0}</div>
                    <div>Win rate: {formatPercent(row.winRate ?? 0)}</div>
                    <div>
                      Avg R:{" "}
                      {row.avgR != null ? `${row.avgR.toFixed(2)}R` : "—"}
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="pnl" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

const headClass =
  "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const numericHeadClass = cn(headClass, "text-right");
const cellClass = "px-3 py-2.5 text-xs";
const numericCellClass = cn(cellClass, "text-right", NUMERIC_CLASS);

function BreakdownTable({
  title,
  subtitle,
  rows,
  currency,
  loading,
  refreshing,
  emptyTitle,
  emptyHint,
  chartVariant = "bar",
}: {
  title: string;
  subtitle: string;
  rows: PerformanceBreakdownRow[];
  currency: CurrencyCode;
  loading: boolean;
  refreshing?: boolean;
  emptyTitle: string;
  emptyHint: string;
  chartVariant?: "bar" | "pie";
}) {
  const visibleRows = rows.slice(0, MAX_ROWS);

  return (
    <DataPanel
      title={title}
      subtitle={subtitle}
      meta={
        loading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            Loading
          </span>
        ) : refreshing ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Updating
          </span>
        ) : (
          `${rows.length} group${rows.length === 1 ? "" : "s"}`
        )
      }
      flush
      footer={
        rows.length > MAX_ROWS
          ? `Showing top ${MAX_ROWS} of ${rows.length} groups by net P&L.`
          : undefined
      }
    >
      {loading && rows.length === 0 ? (
        <div className="flex min-h-[12rem] items-center justify-center p-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading sector and market-cap data…
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="p-4 sm:p-5">
          <PanelEmpty title={emptyTitle} hint={emptyHint} />
        </div>
      ) : (
        <div>
          <div className="border-b border-border/60 px-4 py-4 sm:px-5">
            {chartVariant === "pie" ? (
              <BreakdownPnlPieChart rows={visibleRows} currency={currency} />
            ) : (
              <BreakdownPnlBarChart rows={visibleRows} currency={currency} />
            )}
          </div>
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <TableHead className={headClass}>Group</TableHead>
              <TableHead className={numericHeadClass}>Trades</TableHead>
              <TableHead className={numericHeadClass}>Win rate</TableHead>
              <TableHead className={numericHeadClass}>Avg R</TableHead>
              <TableHead className={numericHeadClass}>Net P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.label} className="border-border/60">
                <TableCell
                  className={cn(cellClass, "max-w-[12rem] truncate font-medium")}
                >
                  {row.label}
                </TableCell>
                <TableCell className={numericCellClass}>{row.trades}</TableCell>
                <TableCell className={numericCellClass}>
                  {formatPercent(row.winRate)}
                </TableCell>
                <TableCell
                  className={cn(numericCellClass, "text-muted-foreground")}
                >
                  {row.avgR !== null ? `${row.avgR.toFixed(2)}R` : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    numericCellClass,
                    "font-semibold",
                    row.totalPnl > 0 && "text-emerald-600 dark:text-emerald-400",
                    row.totalPnl < 0 && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatMoney(row.totalPnl, true, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
          </div>
        </div>
      )}
    </DataPanel>
  );
}

export function PerformanceBreakdownCards({
  trades,
  currency,
}: PerformanceBreakdownCardsProps) {
  const [fundamentals, setFundamentals] = useState<
    Record<string, TickerFundamentals | null>
  >({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equitySymbols = useMemo(() => {
    const seen = new Set<string>();
    const symbols: Array<{
      ticker: string;
      assetClass: JournalTrade["assetClass"];
      listingMarket: NonNullable<JournalTrade["listingMarket"]>;
    }> = [];

    for (const trade of trades) {
      if (trade.assetClass !== "Equities") continue;
      const listingMarket = normalizeListingMarket(
        trade.listingMarket ?? defaultListingMarketForCurrency(currency)
      );
      const key = `${trade.ticker}|${trade.assetClass}|${listingMarket}`;
      if (seen.has(key)) continue;
      seen.add(key);
      symbols.push({
        ticker: trade.ticker,
        assetClass: trade.assetClass,
        listingMarket,
      });
    }

    return symbols;
  }, [trades, currency]);

  const symbolsKey = useMemo(
    () =>
      equitySymbols
        .map(
          (symbol) =>
            `${symbol.ticker}|${symbol.assetClass}|${symbol.listingMarket}`
        )
        .sort()
        .join(","),
    [equitySymbols]
  );

  const cacheKeys = useMemo(
    () => fundamentalsCacheKeysForSymbols(equitySymbols),
    [equitySymbols]
  );

  useEffect(() => {
    if (equitySymbols.length === 0) {
      setFundamentals({});
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    const cached = readFundamentalsCache(cacheKeys);
    const hasFullCache = cacheKeys.every((key) => key in cached);

    if (hasFullCache) {
      setFundamentals(cached);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    if (Object.keys(cached).length > 0) {
      setFundamentals(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    setError(null);

    const controller = new AbortController();

    void fetch("/api/market-data/fundamentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: equitySymbols }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          error?: string;
          fundamentals?: Record<string, TickerFundamentals | null>;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load fundamentals");
        }
        const next = data.fundamentals ?? {};
        setFundamentals(next);
        writeFundamentalsCache(next);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (Object.keys(cached).length === 0) {
          setError(
            err instanceof Error ? err.message : "Could not load fundamentals"
          );
          setFundamentals({});
        }
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });

    return () => controller.abort();
  }, [cacheKeys, equitySymbols, symbolsKey]);

  const sectorRows = useMemo(
    () => computePerformanceBreakdown(trades, fundamentals, currency, "sector"),
    [trades, fundamentals, currency]
  );
  const marketCapRows = useMemo(
    () =>
      computePerformanceBreakdown(trades, fundamentals, currency, "marketCap"),
    [trades, fundamentals, currency]
  );

  if (trades.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
        <DataPanel
          title="Performance by sector"
          subtitle="Realized P&L grouped by company sector"
        >
          <PanelEmpty
            title="No closed trades in this period"
            hint="Close equity trades to see sector attribution."
          />
        </DataPanel>
        <DataPanel
          title="Performance by market cap"
          subtitle="Realized P&L grouped by company size"
        >
          <PanelEmpty
            title="No closed trades in this period"
            hint="Close equity trades to see market-cap attribution."
          />
        </DataPanel>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Some sector and market-cap data could not be loaded. Groups may show
          as unknown.
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
        <BreakdownTable
          title="Performance by sector"
          subtitle="Realized P&L grouped by company sector"
          rows={sectorRows}
          currency={currency}
          loading={loading}
          refreshing={refreshing}
          emptyTitle="No sector data yet"
          emptyHint="Trade listed equities to populate sector breakdown."
          chartVariant="pie"
        />
        <BreakdownTable
          title="Performance by market cap"
          subtitle="Realized P&L grouped by large, mid, small, and micro cap"
          rows={marketCapRows}
          currency={currency}
          loading={loading}
          refreshing={refreshing}
          emptyTitle="No market-cap data yet"
          emptyHint="Trade listed equities to populate market-cap breakdown."
          chartVariant="bar"
        />
      </div>
    </div>
  );
}
