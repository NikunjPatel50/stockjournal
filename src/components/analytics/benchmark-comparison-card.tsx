"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
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
import { useJournalMarket } from "@/components/journal/journal-market-provider";
import { AnimatedPercent } from "@/components/ui/animated-number";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { benchmarkForRegion } from "@/lib/benchmark-return";
import {
  alignComparisonSeries,
  comparisonSummary,
  indexReturnSeries,
  portfolioWindowReturnSeries,
} from "@/lib/benchmark-comparison";
import {
  buildPortfolioChartSeries,
  computeLivePortfolioSnapshot,
  computePortfolioTimeline,
  PORTFOLIO_CHART_TIMEFRAMES,
  type PortfolioChartTimeframe,
} from "@/lib/portfolio-timeline";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type BenchmarkComparisonCardProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

type BenchmarkPoint = { date: string; value: number };

const YOU_COLOR = "#6366f1";
const BENCHMARK_COLOR = "#f59e0b";

function paddedDomain(values: number[]): [number, number] {
  if (values.length === 0) return [-1, 1];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(max - min, 1);
  const pad = Math.max(span * 0.12, 0.4);
  return [min - pad, max + pad];
}

function formatSignedPct(value: number) {
  const digits = Math.abs(value) >= 100 ? 0 : 2;
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function returnTone(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

function ComparisonTooltip({
  active,
  payload,
  benchmarkLabel,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: { date?: string; you?: number; benchmark?: number | null };
  }>;
  benchmarkLabel: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row?.date) return null;

  const you = Number(row.you ?? 0);
  const benchmark = row.benchmark == null ? null : Number(row.benchmark);
  const spread =
    benchmark == null ? null : Math.round((you - benchmark) * 100) / 100;
  const spreadLabel =
    spread == null ? null : spread > 0 ? "Ahead" : spread < 0 ? "Behind" : "In line";

  return (
    <div className="min-w-[12.5rem] rounded-xl border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-lg">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {format(parseISO(row.date), "MMM d, yyyy")}
      </p>
      <div className="mt-2.5 space-y-2">
        <TooltipReturn color={YOU_COLOR} label="You" value={you} />
        {benchmark != null ? (
          <TooltipReturn
            color={BENCHMARK_COLOR}
            label={benchmarkLabel}
            value={benchmark}
          />
        ) : null}
      </div>
      {spread != null && spreadLabel ? (
        <div className="mt-2.5 flex items-center justify-between gap-4 border-t border-border/80 pt-2">
          <span className="text-[11px] text-muted-foreground">{spreadLabel}</span>
          <span className={cn("text-xs font-semibold", NUMERIC_CLASS, returnTone(spread))}>
            {formatSignedPct(spread)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function TooltipReturn({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className={cn("text-xs font-semibold", NUMERIC_CLASS, returnTone(value))}>
        {formatSignedPct(value)}
      </span>
    </div>
  );
}

export const BenchmarkComparisonCard = memo(function BenchmarkComparisonCard({
  trades,
  currency,
}: BenchmarkComparisonCardProps) {
  const { activeRegionId } = useJournalMarket();
  const benchmark = benchmarkForRegion(activeRegionId);
  const [timeframe, setTimeframe] = useState<PortfolioChartTimeframe>("1y");
  const [benchmarkPoints, setBenchmarkPoints] = useState<BenchmarkPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const { getQuote, quoteRevision } = useMarketQuotes();
  const timeline = useMemo(() => computePortfolioTimeline(trades), [trades]);

  const liveSnapshotRef = useRef<ReturnType<
    typeof computeLivePortfolioSnapshot
  > | null>(null);
  const liveSnapshot = useMemo(() => {
    const next = computeLivePortfolioSnapshot(trades, getQuote, currency);
    const prev = liveSnapshotRef.current;
    if (
      prev &&
      prev.date === next.date &&
      prev.invested === next.invested &&
      prev.totalPnl === next.totalPnl &&
      prev.portfolioValue === next.portfolioValue
    ) {
      return prev;
    }
    liveSnapshotRef.current = next;
    return next;
  }, [trades, getQuote, currency, quoteRevision]);

  const portfolioSeries = useMemo(
    () =>
      buildPortfolioChartSeries(timeline, timeframe, new Date(), liveSnapshot),
    [timeline, timeframe, liveSnapshot]
  );

  useEffect(() => {
    const controller = new AbortController();
    setBenchmarkPoints([]);
    setLoading(true);
    setFailed(false);

    fetch(
      `/api/benchmark-return?indexId=${benchmark.id}&timeframe=${timeframe}&anchorValue=1`,
      { signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("benchmark_failed");
        const data = (await response.json()) as { points?: BenchmarkPoint[] };
        if (!controller.signal.aborted) {
          setBenchmarkPoints(data.points ?? []);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setBenchmarkPoints([]);
          setFailed(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [benchmark.id, timeframe]);

  const chartData = useMemo(() => {
    const aligned = alignComparisonSeries(
      portfolioWindowReturnSeries(portfolioSeries),
      indexReturnSeries(benchmarkPoints)
    );
    return aligned.map((point) => ({
      ...point,
      label: format(parseISO(point.date), "MMM d"),
    }));
  }, [portfolioSeries, benchmarkPoints]);

  const summary = useMemo(() => comparisonSummary(chartData), [chartData]);
  const yDomain = useMemo(() => {
    const values = chartData.flatMap((point) =>
      point.benchmark == null ? [point.you] : [point.you, point.benchmark]
    );
    return paddedDomain(values);
  }, [chartData]);

  const timeframeLabel =
    PORTFOLIO_CHART_TIMEFRAMES.find((item) => item.value === timeframe)?.label ??
    "1Y";
  const chartConfig = {
    you: { label: "You", color: YOU_COLOR },
    benchmark: { label: benchmark.label, color: BENCHMARK_COLOR },
  } satisfies ChartConfig;

  const ahead = (summary.spread ?? 0) > 0;
  const behind = (summary.spread ?? 0) < 0;

  return (
    <div className="cv-section overflow-hidden rounded-2xl border-2 border-border bg-card text-foreground shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                <span
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: YOU_COLOR }}
                />
                You
              </span>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
                <span
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: BENCHMARK_COLOR }}
                />
                {benchmark.label}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Performance vs {benchmark.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-semibold tracking-tight sm:text-3xl",
                  ahead && "text-emerald-600 dark:text-emerald-400",
                  behind && "text-rose-600 dark:text-rose-400",
                  !ahead && !behind && "text-foreground"
                )}
              >
                {summary.spread == null ? (
                  "—"
                ) : (
                  <AnimatedPercent value={summary.spread} decimals={2} />
                )}
              </p>
              <p className="mt-2 text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
                <span className={NUMERIC_CLASS}>
                  You {formatSignedPct(summary.you)}
                  {summary.benchmark == null
                    ? ""
                    : ` · ${benchmark.label} ${formatSignedPct(summary.benchmark)}`}
                </span>{" "}
                <span>{timeframeLabel}</span>
              </p>
            </div>
          </div>
        </div>

        {portfolioSeries.length === 0 ? (
          <PanelEmpty
            className="min-h-[14rem] bg-muted/20"
            title="No performance to compare yet"
            hint={`Log trades in your journal to see how your results track the ${benchmark.label}.`}
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <LineChart
              key={`${timeframe}-${benchmark.id}`}
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
                width={56}
                domain={yDomain}
                tickCount={5}
                tickFormatter={(value) => formatSignedPct(Number(value))}
                className="text-[10px] fill-muted-foreground"
              />
              <ReferenceLine y={0} className="stroke-border" strokeWidth={1} />
              <ChartTooltip
                content={<ComparisonTooltip benchmarkLabel={benchmark.label} />}
              />
              <Line
                type="monotone"
                dataKey="you"
                name="you"
                stroke={YOU_COLOR}
                strokeWidth={2}
                isAnimationActive={false}
                dot={chartData.length <= 12 ? { r: 3, fill: YOU_COLOR } : false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                name="benchmark"
                stroke={BENCHMARK_COLOR}
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}

        {portfolioSeries.length > 0 && failed ? (
          <p className="text-xs text-muted-foreground">
            {benchmark.label} prices are unavailable right now. Your line is still shown.
          </p>
        ) : null}
        {portfolioSeries.length > 0 && loading ? (
          <p className="text-xs text-muted-foreground">
            Loading {benchmark.label}…
          </p>
        ) : null}

        <div className="flex w-full min-w-0 justify-start sm:justify-end">
          <div className="flex w-full max-w-full flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/50 p-1 sm:w-auto">
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
