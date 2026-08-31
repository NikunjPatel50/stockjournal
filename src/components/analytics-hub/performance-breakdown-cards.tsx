"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  ChartContainer,
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
  filterTradesByBreakdownGroup,
  type PerformanceBreakdownRow,
} from "@/lib/performance-breakdown";
import { BreakdownGroupTradesSheet } from "@/components/analytics-hub/breakdown-group-trades-sheet";
import { useJournalTrades } from "@/components/journal-trades-provider";
import {
  fundamentalsCacheKeysForSymbols,
  missingFundamentalsCacheKeys,
  readFundamentalsCache,
  writeFundamentalsCache,
} from "@/lib/fundamentals-cache";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import type { CurrencyCode } from "@/lib/settings";
import type { TickerFundamentals } from "@/lib/yahoo-fundamentals";
import { backfillTradeFundamentals } from "@/lib/trade-fundamentals";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type PerformanceBreakdownCardsProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

const MAX_ROWS = 8;

const GROUP_COLORS = [
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

type BreakdownShareRow = {
  name: string;
  pnl: number;
  trades: number;
  winRate: number;
  avgR: number | null;
  share: number;
  color: string;
};

function buildShareRows(rows: PerformanceBreakdownRow[]): BreakdownShareRow[] {
  const totalAbs = rows.reduce((sum, row) => sum + Math.abs(row.totalPnl), 0);

  return rows
    .map((row, index) => ({
      name: row.label,
      pnl: row.totalPnl,
      trades: row.trades,
      winRate: row.winRate,
      avgR: row.avgR,
      share:
        totalAbs > 0
          ? (Math.abs(row.totalPnl) / totalAbs) * 100
          : 100 / Math.max(rows.length, 1),
      color: GROUP_COLORS[index % GROUP_COLORS.length],
    }))
    .sort((a, b) => b.share - a.share);
}

function BreakdownPnlShareChart({
  rows,
  trades,
  fundamentals,
  currency,
  dimension = "sector",
}: {
  rows: PerformanceBreakdownRow[];
  trades: JournalTrade[];
  fundamentals: Record<string, TickerFundamentals | null>;
  currency: CurrencyCode;
  dimension?: "sector" | "marketCap";
}) {
  const [activeSlice, setActiveSlice] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const chartData = useMemo(() => buildShareRows(rows), [rows]);
  const netTotal = useMemo(
    () => chartData.reduce((sum, row) => sum + row.pnl, 0),
    [chartData]
  );

  const pieData = useMemo(
    () =>
      chartData.map((row) => ({
        ...row,
        value: Math.max(row.share, 0.01),
      })),
    [chartData]
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const row of pieData) {
      config[row.name] = { label: row.name, color: row.color };
    }
    return config;
  }, [pieData]);

  const netTone =
    netTotal > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : netTotal < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";

  const activeRow =
    chartData.find((row) => row.name === activeSlice) ?? null;

  const selectedTrades = useMemo(() => {
    if (!selectedGroup) return [];
    return filterTradesByBreakdownGroup(
      trades,
      fundamentals,
      currency,
      dimension,
      selectedGroup
    );
  }, [selectedGroup, trades, fundamentals, currency, dimension]);

  const openGroup = (name: string) => {
    setSelectedGroup(name);
    setActiveSlice(name);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="mx-auto w-full max-w-[12.5rem] shrink-0 sm:mx-0">
          <div className="mb-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Net P&L
            </p>
            <p
              className={cn(
                "mt-0.5 text-lg font-semibold tabular-nums",
                NUMERIC_CLASS,
                netTone
              )}
            >
              {formatMoney(netTotal, true, currency)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {chartData.length} sectors
            </p>
          </div>

          <ChartContainer
            config={chartConfig}
            initialDimension={{ width: 220, height: 220 }}
            className="mx-auto aspect-square w-full max-h-[12.5rem] cursor-pointer"
          >
            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius="52%"
                outerRadius="82%"
                strokeWidth={2}
                stroke="hsl(var(--background))"
                paddingAngle={pieData.length > 1 ? 2 : 0}
                isAnimationActive={false}
                onMouseEnter={(_data, index) => {
                  setActiveSlice(pieData[index]?.name ?? null);
                }}
                onMouseLeave={() => {
                  if (!sheetOpen) setActiveSlice(null);
                }}
                onClick={(_data, index) => {
                  const name = pieData[index]?.name;
                  if (name) openGroup(name);
                }}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    opacity={
                      activeSlice == null || activeSlice === entry.name ? 1 : 0.35
                    }
                    stroke={
                      activeSlice === entry.name
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--background))"
                    }
                    strokeWidth={activeSlice === entry.name ? 2 : 2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {activeRow ? (
            <div className="mt-3 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-sm">
              <p className="font-medium text-foreground">{activeRow.name}</p>
              <p
                className={cn(
                  "mt-1 font-semibold tabular-nums",
                  NUMERIC_CLASS,
                  activeRow.pnl > 0 && "text-emerald-600 dark:text-emerald-400",
                  activeRow.pnl < 0 && "text-rose-600 dark:text-rose-400"
                )}
              >
                {formatMoney(activeRow.pnl, true, currency)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatPercent(activeRow.share, 0)} share · {activeRow.trades} trades ·{" "}
                {formatPercent(activeRow.winRate)} win
                {activeRow.avgR != null ? ` · ${activeRow.avgR.toFixed(2)}R avg` : ""}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Click a slice or sector row for trade details
            </p>
          )}
        </div>

        <ul className="min-w-0 flex-1 space-y-1.5">
          {chartData.map((row) => {
            const isPositive = row.pnl > 0;
            const isNegative = row.pnl < 0;
            const isActive = activeSlice === row.name;

            return (
              <li key={row.name}>
                <button
                  type="button"
                  className={cn(
                    "grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 rounded-lg border px-2 py-1.5 text-left transition-colors sm:gap-x-3 sm:px-2.5",
                    isActive
                      ? "border-border/70 bg-muted/30"
                      : "border-transparent hover:border-border/50 hover:bg-muted/20"
                  )}
                  onMouseEnter={() => setActiveSlice(row.name)}
                  onMouseLeave={() => {
                    if (!sheetOpen) setActiveSlice(null);
                  }}
                  onClick={() => openGroup(row.name)}
                >
                <span
                  className="size-2.5 shrink-0 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                    {row.name}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {row.trades} {row.trades === 1 ? "trade" : "trades"} ·{" "}
                    {formatPercent(row.winRate)} win
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground",
                    NUMERIC_CLASS
                  )}
                >
                  {formatPercent(row.share, 0)}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-right text-xs font-semibold tabular-nums sm:min-w-[5.5rem]",
                    NUMERIC_CLASS,
                    isPositive && "text-emerald-600 dark:text-emerald-400",
                    isNegative && "text-rose-600 dark:text-rose-400",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}
                >
                  {formatMoney(row.pnl, true, currency)}
                </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border/50 pt-2.5 text-[10px] text-muted-foreground">
        <span>Slice size = share of total absolute P&amp;L</span>
        <span className={cn("font-medium", NUMERIC_CLASS)}>
          {formatPercent(
            chartData.reduce((sum, row) => sum + row.share, 0),
            0
          )}{" "}
          allocated
        </span>
      </div>

      <BreakdownGroupTradesSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        groupName={selectedGroup}
        groupType={dimension}
        trades={selectedTrades}
        currency={currency}
      />
    </div>
  );
}

const enterpriseHeadClass =
  "h-8 bg-muted/30 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:px-5";
const enterpriseHeadNumeric = cn(enterpriseHeadClass, "text-right");
const enterpriseCellClass = "px-4 py-2.5 text-xs sm:px-5";
const enterpriseCellNumeric = cn(enterpriseCellClass, "text-right tabular-nums", NUMERIC_CLASS);

function BreakdownPnlBarGraph({
  rows,
  currency,
  maxAbs,
}: {
  rows: PerformanceBreakdownRow[];
  currency: CurrencyCode;
  maxAbs: number;
}) {
  const chartData = useMemo(
    () =>
      rows.map((row) => ({
        name: row.label,
        pnl: row.totalPnl,
        trades: row.trades,
        winRate: row.winRate,
        avgR: row.avgR,
        fill:
          row.totalPnl > 0
            ? "#10b981"
            : row.totalPnl < 0
              ? "#f87171"
              : "#94a3b8",
      })),
    [rows]
  );

  const chartConfig = useMemo(
    () =>
      ({
        pnl: { label: "Net P&L", color: "#10b981" },
      }) satisfies ChartConfig,
    []
  );

  const chartHeight = Math.max(148, chartData.length * 48 + 32);
  const labelWidth = Math.min(
    120,
    Math.max(80, ...chartData.map((row) => row.name.length * 7))
  );
  const xMax = maxAbs * 1.12;
  const hasPositive = chartData.some((row) => row.pnl > 0);
  const hasNegative = chartData.some((row) => row.pnl < 0);
  const xDomain: [number, number] =
    hasPositive && hasNegative
      ? [-xMax, xMax]
      : hasNegative
        ? [-xMax, 0]
        : [0, xMax];

  return (
    <div className="border-b border-border/70 px-4 py-4 sm:px-5">
      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Net P&amp;L by segment
      </p>
      <ChartContainer
        config={chartConfig}
        className="w-full [&_.recharts-cartesian-axis-tick_text]:fill-foreground"
        style={{ height: chartHeight }}
      >
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 8, bottom: 8 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            horizontal={false}
            strokeDasharray="3 3"
            className="stroke-border/60"
          />
          <XAxis
            type="number"
            domain={xDomain}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[10px] fill-muted-foreground"
            tickFormatter={(value) => formatMoney(Number(value), false, currency)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={labelWidth}
            className="text-xs font-medium fill-foreground"
          />
          <ReferenceLine x={0} className="stroke-border" strokeWidth={1.5} />
          <ChartTooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.15)" }}
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
          <Bar dataKey="pnl" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function BreakdownEnterpriseTable({
  rows,
  trades,
  fundamentals,
  currency,
  dimension = "marketCap",
}: {
  rows: PerformanceBreakdownRow[];
  trades: JournalTrade[];
  fundamentals: Record<string, TickerFundamentals | null>;
  currency: CurrencyCode;
  dimension?: "sector" | "marketCap";
}) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.totalPnl - b.totalPnl),
    [rows]
  );

  const maxAbs = useMemo(
    () => Math.max(1, ...sortedRows.map((row) => Math.abs(row.totalPnl))),
    [sortedRows]
  );

  const netTotal = useMemo(
    () => sortedRows.reduce((sum, row) => sum + row.totalPnl, 0),
    [sortedRows]
  );

  const totalAbs = useMemo(
    () => sortedRows.reduce((sum, row) => sum + Math.abs(row.totalPnl), 0),
    [sortedRows]
  );

  const hasPositive = sortedRows.some((row) => row.totalPnl > 0);
  const hasNegative = sortedRows.some((row) => row.totalPnl < 0);
  const mixed = hasPositive && hasNegative;

  const netTone =
    netTotal > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : netTotal < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";

  const worst = sortedRows[0];
  const best = sortedRows[sortedRows.length - 1];

  const selectedTrades = useMemo(() => {
    if (!selectedGroup) return [];
    return filterTradesByBreakdownGroup(
      trades,
      fundamentals,
      currency,
      dimension,
      selectedGroup
    );
  }, [selectedGroup, trades, fundamentals, currency, dimension]);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Net realized P&amp;L
          </p>
          <p className={cn("mt-1 text-2xl font-semibold tabular-nums", NUMERIC_CLASS, netTone)}>
            {formatMoney(netTotal, true, currency)}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Segments
            </dt>
            <dd className={cn("mt-0.5 font-medium tabular-nums", NUMERIC_CLASS)}>
              {sortedRows.length}
            </dd>
          </div>
          {worst ? (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Largest drag
              </dt>
              <dd className="mt-0.5 truncate font-medium text-foreground">
                {worst.label}
              </dd>
            </div>
          ) : null}
          {best && best.label !== worst?.label ? (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Best bucket
              </dt>
              <dd className="mt-0.5 truncate font-medium text-foreground">
                {best.label}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <BreakdownPnlBarGraph
        rows={sortedRows}
        currency={currency}
        maxAbs={maxAbs}
      />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <TableHead className={enterpriseHeadClass}>Segment</TableHead>
              <TableHead className={enterpriseHeadNumeric}>Trades</TableHead>
              <TableHead className={enterpriseHeadNumeric}>Win rate</TableHead>
              <TableHead className={enterpriseHeadNumeric}>Avg R</TableHead>
              <TableHead className={cn(enterpriseHeadClass, "min-w-[9rem]")}>
                Contribution
              </TableHead>
              <TableHead className={cn(enterpriseHeadNumeric, "pr-4 sm:pr-5")}>
                Net P&amp;L
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => {
              const magnitude = (Math.abs(row.totalPnl) / maxAbs) * 100;
              const share =
                totalAbs > 0
                  ? (Math.abs(row.totalPnl) / totalAbs) * 100
                  : 0;
              const isPositive = row.totalPnl > 0;
              const isNegative = row.totalPnl < 0;

              return (
                <TableRow
                  key={row.label}
                  className="cursor-pointer border-border/60 hover:bg-muted/15"
                  onClick={() => {
                    setSelectedGroup(row.label);
                    setSheetOpen(true);
                  }}
                >
                  <TableCell className={cn(enterpriseCellClass, "font-medium text-foreground")}>
                    {row.label}
                  </TableCell>
                  <TableCell className={cn(enterpriseCellNumeric, "text-muted-foreground")}>
                    {row.trades}
                  </TableCell>
                  <TableCell className={cn(enterpriseCellNumeric, "text-muted-foreground")}>
                    {formatPercent(row.winRate)}
                  </TableCell>
                  <TableCell className={cn(enterpriseCellNumeric, "text-muted-foreground")}>
                    {row.avgR !== null ? `${row.avgR.toFixed(2)}R` : "—"}
                  </TableCell>
                  <TableCell className={enterpriseCellClass}>
                    <div className="flex min-w-[7.5rem] items-center gap-2.5">
                      <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted/70">
                        {mixed ? (
                          <>
                            <div
                              className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/80"
                              aria-hidden
                            />
                            {row.totalPnl !== 0 ? (
                              <div
                                className={cn(
                                  "absolute inset-y-0 rounded-sm",
                                  isPositive
                                    ? "left-1/2 bg-emerald-600/70 dark:bg-emerald-500/60"
                                    : "right-1/2 bg-slate-500/70 dark:bg-slate-400/50"
                                )}
                                style={{
                                  width: `${Math.max(magnitude / 2, 2)}%`,
                                }}
                              />
                            ) : null}
                          </>
                        ) : (
                          <div
                            className={cn(
                              "h-full rounded-sm",
                              isPositive
                                ? "bg-emerald-600/70 dark:bg-emerald-500/60"
                                : "bg-slate-500/70 dark:bg-slate-400/50"
                            )}
                            style={{
                              width: `${Math.max(magnitude, row.totalPnl !== 0 ? 3 : 0)}%`,
                            }}
                          />
                        )}
                      </div>
                      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                        {formatPercent(share, 0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      enterpriseCellNumeric,
                      "pr-4 font-semibold sm:pr-5",
                      isPositive && "text-emerald-600 dark:text-emerald-400",
                      isNegative && "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {formatMoney(row.totalPnl, true, currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <BreakdownGroupTradesSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        groupName={selectedGroup}
        groupType={dimension}
        trades={selectedTrades}
        currency={currency}
      />
    </div>
  );
}

function BreakdownTable({
  title,
  subtitle,
  rows,
  trades,
  fundamentals,
  currency,
  loading,
  refreshing,
  emptyTitle,
  emptyHint,
  chartVariant = "bar",
  dimension = "sector",
}: {
  title: string;
  subtitle: string;
  rows: PerformanceBreakdownRow[];
  trades: JournalTrade[];
  fundamentals: Record<string, TickerFundamentals | null>;
  currency: CurrencyCode;
  loading: boolean;
  refreshing?: boolean;
  emptyTitle: string;
  emptyHint: string;
  chartVariant?: "bar" | "pie";
  dimension?: "sector" | "marketCap";
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
      ) : chartVariant === "pie" ? (
        <div className="px-4 py-3 sm:px-5">
          <BreakdownPnlShareChart
            rows={visibleRows}
            trades={trades}
            fundamentals={fundamentals}
            currency={currency}
            dimension={dimension}
          />
        </div>
      ) : (
        <BreakdownEnterpriseTable
          rows={visibleRows}
          trades={trades}
          fundamentals={fundamentals}
          currency={currency}
          dimension={dimension}
        />
      )}
    </DataPanel>
  );
}

export function PerformanceBreakdownCards({
  trades,
  currency,
}: PerformanceBreakdownCardsProps) {
  const { trades: allTrades, setTrades } = useJournalTrades();
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
    const missingKeys = missingFundamentalsCacheKeys(cacheKeys, cached);
    const symbolsToFetch = equitySymbols.filter((symbol) => {
      const key = fundamentalsCacheKeysForSymbols([symbol])[0];
      return missingKeys.includes(key);
    });

    if (symbolsToFetch.length === 0) {
      setFundamentals(cached);
      setLoading(false);
      setRefreshing(false);
      setError(null);

      const backfilled = backfillTradeFundamentals(allTrades, cached, currency);
      if (backfilled !== allTrades) {
        setTrades(backfilled);
      }
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
      body: JSON.stringify({ symbols: symbolsToFetch }),
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
        const fetched = data.fundamentals ?? {};
        const merged = { ...cached, ...fetched };
        setFundamentals(merged);
        writeFundamentalsCache(fetched);

        const backfilled = backfillTradeFundamentals(allTrades, merged, currency);
        if (backfilled !== allTrades) {
          setTrades(backfilled);
        }
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
  }, [allTrades, cacheKeys, currency, equitySymbols, setTrades, symbolsKey]);

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
          trades={trades}
          fundamentals={fundamentals}
          currency={currency}
          loading={loading}
          refreshing={refreshing}
          emptyTitle="No sector data yet"
          emptyHint="Trade listed equities to populate sector breakdown."
          chartVariant="pie"
          dimension="sector"
        />
        <BreakdownTable
          title="Performance by market cap"
          subtitle="Realized P&L grouped by large, mid, small, and micro cap"
          rows={marketCapRows}
          trades={trades}
          fundamentals={fundamentals}
          currency={currency}
          loading={loading}
          refreshing={refreshing}
          emptyTitle="No market-cap data yet"
          emptyHint="Trade listed equities to populate market-cap breakdown."
          chartVariant="bar"
          dimension="marketCap"
        />
      </div>
    </div>
  );
}
