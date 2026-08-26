"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { PanelEmpty } from "@/components/data-panel";
import { AnimatedNumber, AnimatedPercent } from "@/components/ui/animated-number";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatChartAxisMoney, formatMoney, formatSignedPercent } from "@/lib/analytics";
import type { BenchmarkHistoryPoint } from "@/lib/benchmark-return";
import {
  computePortfolioPeriodReturnPercent,
  computePortfolioXirrPercent,
  sanitizeReturnPercent,
} from "@/lib/portfolio-xirr";
import {
  buildPortfolioChartSeries,
  computeLivePortfolioSnapshot,
  computePortfolioTimeline,
  PORTFOLIO_CHART_TIMEFRAMES,
  portfolioMetricValue,
  portfolioPeriodChange,
  type PortfolioChartTimeframe,
  type PortfolioMetric,
} from "@/lib/portfolio-timeline";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type PortfolioOverviewCardProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

const METRICS: { value: PortfolioMetric; label: string; color: string }[] = [
  { value: "portfolio", label: "Portfolio", color: "#6366f1" },
  { value: "invested", label: "Invested", color: "#6366f1" },
  { value: "pnl", label: "Total P&L", color: "#10b981" },
];

function paddedDomain(values: number[]): [number, number] {
  if (values.length === 0) return [-1, 1];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(max - min, 1);
  const pad = Math.max(span * 0.12, 1);
  return [min - pad, max + pad];
}

const BENCHMARK_ID = "nifty50";
const BENCHMARK_LABEL = "Nifty 50";

function computeBenchmarkReturnPercent(
  xirr: number | null,
  periodReturn: number | null,
  points: BenchmarkHistoryPoint[]
): number | null {
  if (periodReturn != null) return sanitizeReturnPercent(periodReturn);
  if (xirr != null) return sanitizeReturnPercent(xirr);
  if (points.length < 2) return null;

  const start = points[0]?.value;
  const end = points[points.length - 1]?.value;
  if (start == null || end == null || start <= 0) return null;

  return sanitizeReturnPercent(((end / start) - 1) * 100);
}

function BenchmarkStatsCard({
  portfolioReturn,
  benchmarkReturn,
  benchmarkLoading,
}: {
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  benchmarkLoading: boolean;
}) {
  return (
    <div className="grid min-w-0 w-full grid-cols-2 gap-px overflow-hidden rounded-xl border-2 border-border bg-border/70 sm:min-w-[12rem]">
      <div className="min-w-0 bg-card px-3 py-3 text-center sm:px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Portfolio XIRR
        </p>
        <p
          className={cn(
            "mt-1 truncate text-sm font-semibold sm:text-base",
            NUMERIC_CLASS,
            portfolioReturn != null &&
              portfolioReturn > 0 &&
              "text-emerald-600 dark:text-emerald-400",
            portfolioReturn != null &&
              portfolioReturn < 0 &&
              "text-rose-600 dark:text-rose-400",
            portfolioReturn == null && "text-foreground"
          )}
        >
          {portfolioReturn != null
            ? formatSignedPercent(portfolioReturn, 2)
            : "—"}
        </p>
      </div>
      <div className="min-w-0 bg-card px-3 py-3 text-center sm:px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {BENCHMARK_LABEL}
        </p>
        <p
          className={cn(
            "mt-1 truncate text-sm font-semibold sm:text-base",
            NUMERIC_CLASS,
            benchmarkReturn != null &&
              benchmarkReturn > 0 &&
              "text-emerald-600 dark:text-emerald-400",
            benchmarkReturn != null &&
              benchmarkReturn < 0 &&
              "text-rose-600 dark:text-rose-400",
            benchmarkLoading && "text-muted-foreground",
            benchmarkReturn == null && !benchmarkLoading && "text-foreground"
          )}
        >
          {benchmarkLoading
            ? "…"
            : benchmarkReturn != null
              ? formatSignedPercent(benchmarkReturn, 2)
              : "—"}
        </p>
      </div>
    </div>
  );
}

export const PortfolioOverviewCard = memo(function PortfolioOverviewCard({
  trades,
  currency,
}: PortfolioOverviewCardProps) {
  const [timeframe, setTimeframe] = useState<PortfolioChartTimeframe>("1y");
  const [metric, setMetric] = useState<PortfolioMetric>("portfolio");
  const [benchmarkXirr, setBenchmarkXirr] = useState<number | null>(null);
  const [benchmarkPeriodReturn, setBenchmarkPeriodReturn] = useState<
    number | null
  >(null);
  const [benchmarkPoints, setBenchmarkPoints] = useState<BenchmarkHistoryPoint[]>(
    []
  );
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  const { getQuote, quoteRevision } = useMarketQuotes();

  const timeline = useMemo(() => computePortfolioTimeline(trades), [trades]);
  const showBenchmark = timeline.length > 0;

  const liveSnapshot = useMemo(
    () => computeLivePortfolioSnapshot(trades, getQuote, currency),
    [trades, getQuote, currency, quoteRevision]
  );
  const chartSeries = useMemo(
    () => buildPortfolioChartSeries(timeline, timeframe, new Date(), liveSnapshot),
    [timeline, timeframe, liveSnapshot]
  );

  const portfolioXirr = useMemo(
    () => computePortfolioXirrPercent(trades, chartSeries, timeframe),
    [trades, chartSeries, timeframe]
  );
  const portfolioReturn = useMemo(() => {
    if (portfolioXirr != null) return portfolioXirr;
    const annualized = computePortfolioPeriodReturnPercent(
      chartSeries,
      "portfolio"
    );
    if (annualized != null) return annualized;
    return sanitizeReturnPercent(
      portfolioPeriodChange(chartSeries, "portfolio").deltaPct
    );
  }, [portfolioXirr, chartSeries]);

  const benchmarkReturn = useMemo(
    () =>
      computeBenchmarkReturnPercent(
        benchmarkXirr,
        benchmarkPeriodReturn,
        benchmarkPoints
      ),
    [benchmarkXirr, benchmarkPeriodReturn, benchmarkPoints]
  );

  useEffect(() => {
    let cancelled = false;
    setBenchmarkLoading(true);

    fetch(
      `/api/benchmark-return?indexId=${encodeURIComponent(BENCHMARK_ID)}&timeframe=${encodeURIComponent(timeframe)}&anchorValue=1`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("benchmark fetch failed");
        return res.json() as Promise<{
          xirr: number | null;
          periodReturn: number | null;
          points: BenchmarkHistoryPoint[];
        }>;
      })
      .then((data) => {
        if (!cancelled) {
          setBenchmarkXirr(data.xirr);
          setBenchmarkPeriodReturn(data.periodReturn);
          setBenchmarkPoints(data.points ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBenchmarkXirr(null);
          setBenchmarkPeriodReturn(null);
          setBenchmarkPoints([]);
        }
      })
      .finally(() => {
        if (!cancelled) setBenchmarkLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  const chartData = useMemo(
    () =>
      chartSeries.map((point) => ({
        ...point,
        label: format(parseISO(point.date), "MMM d"),
        value: portfolioMetricValue(point, metric),
      })),
    [chartSeries, metric]
  );

  const change = useMemo(
    () => portfolioPeriodChange(chartSeries, metric),
    [chartSeries, metric]
  );

  const periodEnd = chartSeries.at(-1) ?? liveSnapshot;
  const activeMetric = METRICS.find((item) => item.value === metric) ?? METRICS[0];

  const chartConfig = {
    value: { label: activeMetric.label, color: activeMetric.color },
  } satisfies ChartConfig;

  const yDomain = useMemo(() => {
    const values = chartData.map((point) => point.value);
    return paddedDomain(values);
  }, [chartData]);

  const changeUp = change.delta > 0;
  const changeDown = change.delta < 0;
  const timeframeLabel =
    PORTFOLIO_CHART_TIMEFRAMES.find((item) => item.value === timeframe)?.label ??
    "1Y";

  return (
    <div className="cv-section overflow-hidden rounded-2xl border-2 border-border bg-card text-foreground shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {METRICS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMetric(item.value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    metric === item.value
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className="size-2 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </button>
              ))}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                {metric === "portfolio"
                  ? "Current"
                  : metric === "invested"
                    ? "Invested"
                    : "Total P&L"}
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl",
                  metric === "pnl" &&
                    change.current > 0 &&
                    "text-emerald-600 dark:text-emerald-400",
                  metric === "pnl" &&
                    change.current < 0 &&
                    "text-rose-600 dark:text-rose-400",
                  metric !== "pnl" && "text-foreground"
                )}
              >
                <AnimatedNumber
                  value={change.current}
                  format={(amount) =>
                    formatMoney(amount, metric === "pnl", currency)
                  }
                />
              </p>
              <p
                className={cn(
                  "mt-2 text-xs font-medium leading-snug sm:text-sm",
                  changeUp && "text-emerald-600 dark:text-emerald-400",
                  changeDown && "text-rose-600 dark:text-rose-400",
                  !changeUp && !changeDown && "text-muted-foreground"
                )}
              >
                <span className="whitespace-nowrap">
                  <AnimatedNumber
                    value={change.delta}
                    format={(amount) => formatMoney(amount, true, currency)}
                  />
                  {" ("}
                  <AnimatedPercent value={change.deltaPct} decimals={2} />
                  {")"}
                </span>{" "}
                <span className="text-muted-foreground">{timeframeLabel}</span>
              </p>
            </div>
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:max-w-none">
            {periodEnd ? (
              <div className="grid min-w-0 w-full grid-cols-2 gap-px overflow-hidden rounded-xl border-2 border-border bg-border/70 sm:min-w-[12rem]">
                <div className="min-w-0 bg-card px-3 py-3 text-center sm:px-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Invested
                  </p>
                  <p
                    className={cn(
                      "mt-1 truncate text-sm font-semibold text-foreground sm:text-base"
                    )}
                  >
                    <AnimatedNumber
                      value={periodEnd.invested}
                      format={(amount) => formatMoney(amount, false, currency)}
                    />
                  </p>
                </div>
                <div className="min-w-0 bg-card px-3 py-3 text-center sm:px-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Total P&L
                  </p>
                  <p
                    className={cn(
                      "mt-1 truncate text-sm font-semibold sm:text-base",
                      periodEnd.totalPnl > 0 && "text-emerald-600 dark:text-emerald-400",
                      periodEnd.totalPnl < 0 && "text-rose-600 dark:text-rose-400",
                      periodEnd.totalPnl === 0 && "text-foreground"
                    )}
                  >
                    <AnimatedNumber
                      value={periodEnd.totalPnl}
                      format={(amount) => formatMoney(amount, true, currency)}
                    />
                  </p>
                </div>
              </div>
            ) : null}
            {showBenchmark ? (
              <BenchmarkStatsCard
                portfolioReturn={portfolioReturn}
                benchmarkReturn={benchmarkReturn}
                benchmarkLoading={benchmarkLoading}
              />
            ) : null}
          </div>
        </div>

        {chartData.length === 0 ? (
          <PanelEmpty
            className="min-h-[14rem] bg-muted/20"
            title="No portfolio history yet"
            hint="Log trades in your journal to track invested capital and total P&L over time."
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <LineChart
              key={`${timeframe}-${metric}`}
              data={chartData}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="2 6"
                className="stroke-border/60"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
                className="text-[10px] fill-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={68}
                domain={yDomain}
                tickCount={5}
                tickFormatter={(value) =>
                  formatChartAxisMoney(Number(value), currency)
                }
                className="text-[10px] fill-muted-foreground"
              />
              <ReferenceLine y={0} className="stroke-border" strokeWidth={1} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | { date?: string }
                        | undefined;
                      if (!row?.date) return "";
                      return format(parseISO(row.date), "MMM d, yyyy");
                    }}
                    formatter={(value) => (
                      <span className={NUMERIC_CLASS}>
                        {activeMetric.label}: {formatMoney(Number(value), true, currency)}
                      </span>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={activeMetric.color}
                strokeWidth={2}
                isAnimationActive={false}
                dot={
                  chartData.length <= 12
                    ? { r: 3, fill: activeMetric.color }
                    : false
                }
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}

        <div className="flex w-full min-w-0 justify-start sm:justify-end">
          <div className="inline-flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-border bg-muted/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PORTFOLIO_CHART_TIMEFRAMES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTimeframe(item.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  timeframe === item.value
                    ? "border border-border bg-muted text-foreground shadow-sm"
                    : "border border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
