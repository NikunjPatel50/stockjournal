"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { TimeframeSelect } from "@/components/analytics/timeframe-select";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-media-query";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import {
  activePositionTodayPnl,
  computeTodayDailyPnlFromQuotes,
  isActivePositionTodayPnlPending,
  patchTodayDailyFromQuotes,
  toActivePositionPnlInput,
} from "@/lib/active-position-daily-pnl";
import {
  buildDailyPnlChartSeries,
  emptyAnalyticsFilters,
  filterDailyPnlByTimeframe,
  formatChartAxisMoney,
  formatMoney,
  type AnalyticsFilters,
  type DailyPnlPoint,
} from "@/lib/analytics";
import {
  readActivePositionPnlCache,
  writeActivePositionPnlCache,
} from "@/lib/active-position-pnl-cache";
import { defaultListingMarketForCurrency } from "@/lib/equity-listing-markets";
import { sessionCloseDescription } from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn } from "@/lib/utils";

type PnlChartCardProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

const chartConfig = {
  pnl: { label: "P&L", color: "var(--chart-2)" },
} satisfies ChartConfig;

function paddedDomain(values: number[]): [number, number] {
  if (values.length === 0) return [-1, 1];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(max - min, 1);
  const pad = Math.max(span * 0.15, 1);
  return [min - pad, max + pad];
}

function Stat({
  label,
  value,
  tone,
  valueTitle,
}: {
  label: string;
  value: ReactNode;
  tone?: "profit" | "loss" | "neutral";
  valueTitle?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center bg-card px-2 py-3 sm:px-4">
      <p className="w-full text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-muted-foreground sm:text-[10px] sm:tracking-[0.1em]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 w-full truncate text-center text-sm font-semibold sm:text-[15px]",
          tone === "profit" && "text-emerald-600 dark:text-emerald-400",
          tone === "loss" && "text-rose-600 dark:text-rose-400",
          tone === "neutral" && "text-foreground"
        )}
        title={valueTitle}
      >
        {value}
      </p>
    </div>
  );
}

export const PnlChartCard = memo(function PnlChartCard({
  trades,
  currency,
}: PnlChartCardProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    ...emptyAnalyticsFilters(),
    timeframe: "7d",
  });
  const [dateOpen, setDateOpen] = useState(false);
  const [daily, setDaily] = useState<DailyPnlPoint[]>([]);
  const [priorSessionBarByTradeId, setPriorSessionBarByTradeId] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const hasCachedDailyRef = useRef(false);
  const isMobile = useIsMobile();

  const activePool = useMemo(
    () => trades.filter((trade) => (trade.status ?? "Closed") === "Active"),
    [trades]
  );

  const { getQuote, loading: quotesLoading, quoteRevision } = useMarketQuotes();

  const activeTrades = useMemo(
    () =>
      trades
        .map(toActivePositionPnlInput)
        .filter((trade): trade is NonNullable<typeof trade> => trade != null),
    [trades]
  );

  const activeTradesKey = useMemo(
    () =>
      activeTrades
        .map(
          (trade) =>
            `${trade.id}:${trade.quantity}:${trade.entryPrice}:${trade.entryDate}`
        )
        .join("|"),
    [activeTrades]
  );

  const pnlCacheKey = useMemo(
    () => `${currency}:${activeTradesKey}`,
    [currency, activeTradesKey]
  );

  useLayoutEffect(() => {
    if (activeTrades.length === 0) {
      hasCachedDailyRef.current = false;
      setLoading(false);
      return;
    }

    const cached = readActivePositionPnlCache(pnlCacheKey);
    if (!cached) {
      hasCachedDailyRef.current = false;
      setLoading(true);
      return;
    }

    setDaily(cached.daily);
    setPriorSessionBarByTradeId(cached.priorSessionBarByTradeId);
    setLoading(false);
    setError(null);
    hasCachedDailyRef.current = cached.daily.length > 0;
  }, [pnlCacheKey, activeTrades.length]);

  const primaryListingMarket = useMemo(
    () =>
      activeTrades[0]?.listingMarket ??
      defaultListingMarketForCurrency(currency),
    [activeTrades, currency]
  );

  const todayPending = useMemo(
    () => isActivePositionTodayPnlPending(activeTrades, currency, now),
    [activeTrades, currency, now]
  );

  const fetchDailyPnl = useCallback(
    async (signal?: AbortSignal) => {
      if (activeTrades.length === 0) {
        setDaily([]);
        setLoading(false);
        setRefreshing(false);
        setError(null);
        hasCachedDailyRef.current = false;
        return;
      }

      const hasCached = hasCachedDailyRef.current;
      if (hasCached) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fetch("/api/market-data/active-position-pnl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trades: activeTrades,
            currency,
          }),
          signal,
        });
        const data = (await res.json()) as {
          error?: string;
          daily?: DailyPnlPoint[];
          priorSessionBarByTradeId?: Record<string, boolean>;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load active position P&L");
        }

        const nextDaily = data.daily ?? [];
        const nextPrior = data.priorSessionBarByTradeId ?? {};
        setDaily(nextDaily);
        setPriorSessionBarByTradeId(nextPrior);
        hasCachedDailyRef.current = nextDaily.length > 0;
        writeActivePositionPnlCache(pnlCacheKey, {
          daily: nextDaily,
          priorSessionBarByTradeId: nextPrior,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (!hasCachedDailyRef.current) {
          setError(
            err instanceof Error ? err.message : "Could not load active position P&L"
          );
          setDaily([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTrades, currency, pnlCacheKey]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchDailyPnl(controller.signal);
    return () => controller.abort();
  }, [fetchDailyPnl, activeTradesKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
      if (todayPending && activeTrades.length > 0) {
        void fetchDailyPnl();
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [todayPending, activeTrades.length, fetchDailyPnl]);

  const dailyWithQuotes = useMemo(() => {
    if (activeTrades.length === 0) return daily;

    const quotesByTradeId: Record<
      string,
      { price: number; changePercent?: number | null }
    > = {};
    for (const trade of activePool) {
      const input = toActivePositionPnlInput(trade);
      if (!input) continue;
      const quote = getQuote(trade);
      if (quote?.price != null && quote.price > 0) {
        quotesByTradeId[input.id] = {
          price: quote.price,
          changePercent: quote.changePercent,
        };
      }
    }

    return patchTodayDailyFromQuotes(
      daily,
      activeTrades,
      quotesByTradeId,
      currency,
      now,
      priorSessionBarByTradeId
    );
  }, [
    activeTrades,
    activePool,
    currency,
    daily,
    quoteRevision,
    getQuote,
    now,
    priorSessionBarByTradeId,
    quotesLoading,
  ]);

  const filteredDaily = useMemo(
    () => filterDailyPnlByTimeframe(dailyWithQuotes, filters, now),
    [dailyWithQuotes, filters, now]
  );

  const chartSeries = useMemo(
    () => buildDailyPnlChartSeries(dailyWithQuotes, filters, now),
    [dailyWithQuotes, filters, now]
  );

  const netPnl = useMemo(
    () =>
      Math.round(
        filteredDaily.reduce((sum, point) => sum + point.pnl, 0) * 100
      ) / 100,
    [filteredDaily]
  );

  const avgPnl = useMemo(() => {
    if (filteredDaily.length === 0) return null;
    return (
      Math.round((netPnl / filteredDaily.length) * 100) / 100
    );
  }, [filteredDaily.length, netPnl]);

  const todayPnl = useMemo(
    () => activePositionTodayPnl(dailyWithQuotes, activeTrades, currency, now),
    [dailyWithQuotes, activeTrades, currency, now]
  );

  const todayLivePnl = useMemo(() => {
    const quotesByTradeId: Record<
      string,
      { price: number; changePercent?: number | null }
    > = {};

    for (const trade of activePool) {
      const input = toActivePositionPnlInput(trade);
      if (!input) continue;
      const quote = getQuote(trade);
      if (quote?.price != null && quote.price > 0) {
        quotesByTradeId[input.id] = {
          price: quote.price,
          changePercent: quote.changePercent,
        };
      }
    }

    return computeTodayDailyPnlFromQuotes(
      activeTrades,
      quotesByTradeId,
      currency,
      now,
      priorSessionBarByTradeId
    );
  }, [
    activePool,
    activeTrades,
    currency,
    getQuote,
    now,
    priorSessionBarByTradeId,
    quoteRevision,
  ]);

  const todayDisplayPnl =
    todayLivePnl.pricedCount > 0 ? todayLivePnl.totalPnl : todayPnl;

  const marketCloseHint = useMemo(
    () => sessionCloseDescription(primaryListingMarket),
    [primaryListingMarket]
  );

  const bestDay = useMemo(() => {
    if (filteredDaily.length === 0) return null;
    return filteredDaily.reduce((best, point) =>
      point.pnl > best.pnl ? point : best
    );
  }, [filteredDaily]);

  const worstDay = useMemo(() => {
    if (filteredDaily.length === 0) return null;
    return filteredDaily.reduce((worst, point) =>
      point.pnl < worst.pnl ? point : worst
    );
  }, [filteredDaily]);

  const yDomain = useMemo(
    () => paddedDomain(chartSeries.map((point) => point.pnl)),
    [chartSeries]
  );

  const customRangeLabel =
    filters.customFrom || filters.customTo
      ? `${filters.customFrom ? format(filters.customFrom, "MMM d, yyyy") : "Start"} – ${
          filters.customTo ? format(filters.customTo, "MMM d, yyyy") : "End"
        }`
      : "Select dates";

  const datePicker =
    filters.timeframe === "custom" ? (
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 rounded-md border-border bg-background px-2.5",
                "text-[11px] font-medium shadow-none sm:text-xs"
              )}
            />
          }
        >
          <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="max-w-[10rem] truncate sm:max-w-none">
            {customRangeLabel}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={isMobile ? 1 : 2}
            selected={{
              from: filters.customFrom,
              to: filters.customTo,
            }}
            onSelect={(range) =>
              setFilters((current) => ({
                ...current,
                customFrom: range?.from,
                customTo: range?.to,
              }))
            }
          />
        </PopoverContent>
      </Popover>
    ) : null;

  const hasDailyData = daily.length > 0;

  return (
    <DataPanel
      title="P&L chart"
      subtitle="Daily mark-to-market P&L on your open positions"
      meta={
        loading && !hasDailyData ? (
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
          `${activeTrades.length} open`
        )
      }
      action={
        <TimeframeSelect
          value={filters.timeframe}
          onChange={(timeframe) =>
            setFilters((current) => ({ ...current, timeframe }))
          }
          trailing={datePicker}
        />
      }
      footer={
        todayPending
          ? `Today's bar appears after market close (${marketCloseHint}). Each bar is the combined daily change across active positions (vs prior close, or entry on day one).`
          : "Each bar is the combined daily change across active positions (vs prior close, or entry on day one)."
      }
    >
      {activeTrades.length === 0 ? (
        <PanelEmpty
          title="No open positions"
          hint="Log an active trade in the journal to track daily P&L here."
        />
      ) : loading && filteredDaily.length === 0 ? (
        <div className="flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading daily P&L for open positions…
        </div>
      ) : error ? (
        <PanelEmpty
          title="Could not load daily P&L"
          hint={error}
        />
      ) : filteredDaily.length === 0 ? (
        <PanelEmpty
          title={
            filters.timeframe === "today" && todayPending
              ? "Today's P&L not finalized yet"
              : "No daily P&L in this period"
          }
          hint={
            filters.timeframe === "today" && todayPending
              ? `Daily P&L appears after market close (${marketCloseHint}).`
              : "Try a wider timeframe or wait for the next trading session."
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid w-full min-w-0 grid-cols-2 gap-px overflow-hidden rounded-lg border-2 border-border bg-border/70 md:grid-cols-4">
            <Stat
              label="Period P&L"
              value={
                <AnimatedNumber
                  value={netPnl}
                  format={(amount) => formatMoney(amount, true, currency)}
                />
              }
              valueTitle={formatMoney(netPnl, true, currency)}
              tone={netPnl > 0 ? "profit" : netPnl < 0 ? "loss" : "neutral"}
            />
            <Stat
              label="Avg P/L"
              value={
                avgPnl != null ? (
                  <AnimatedNumber
                    value={avgPnl}
                    format={(amount) => formatMoney(amount, true, currency)}
                  />
                ) : (
                  "—"
                )
              }
              valueTitle={
                avgPnl != null ? formatMoney(avgPnl, true, currency) : "—"
              }
              tone={
                avgPnl == null
                  ? "neutral"
                  : avgPnl > 0
                    ? "profit"
                    : avgPnl < 0
                      ? "loss"
                      : "neutral"
              }
            />
            <Stat label="Open positions" value={String(activeTrades.length)} />
            <Stat
              label="Today's P/L"
              value={
                activeTrades.length === 0 ? (
                  <AnimatedNumber
                    value={0}
                    format={(amount) => formatMoney(amount, true, currency)}
                  />
                ) : (loading || quotesLoading) && todayDisplayPnl == null ? (
                  "…"
                ) : todayDisplayPnl != null ? (
                  <AnimatedNumber
                    value={todayDisplayPnl}
                    format={(amount) => formatMoney(amount, true, currency)}
                  />
                ) : todayPending ? (
                  "Pending"
                ) : (
                  "—"
                )
              }
              valueTitle={
                activeTrades.length === 0
                  ? formatMoney(0, true, currency)
                  : (loading || quotesLoading) && todayDisplayPnl == null
                    ? "…"
                    : todayDisplayPnl != null
                      ? formatMoney(todayDisplayPnl, true, currency)
                      : todayPending
                        ? "Pending"
                        : "—"
              }
              tone={
                activeTrades.length === 0
                  ? "neutral"
                  : (loading || quotesLoading) && todayDisplayPnl == null
                    ? "neutral"
                    : todayDisplayPnl == null
                      ? "neutral"
                      : todayDisplayPnl > 0
                        ? "profit"
                        : todayDisplayPnl < 0
                          ? "loss"
                          : "neutral"
              }
            />
          </div>

          <ChartContainer config={chartConfig} className="h-[220px] w-full min-w-0">
            <BarChart
              key={filters.timeframe}
              data={chartSeries}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              barCategoryGap="28%"
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
                minTickGap={isMobile ? 16 : 24}
                className="text-[10px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={isMobile ? 64 : 72}
                domain={yDomain}
                tickCount={5}
                tickFormatter={(value) =>
                  formatChartAxisMoney(Number(value), currency)
                }
                className="text-[10px]"
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
                    formatter={(value, _name, item) => {
                      const row = item?.payload as
                        | { trades?: number; pnl?: number }
                        | undefined;
                      const pnl = Number(value);
                      const trades = row?.trades ?? 0;
                      if (pnl === 0 && trades === 0) {
                        return (
                          <div className="text-muted-foreground">No session</div>
                        );
                      }
                      return (
                        <div className="space-y-0.5">
                          <div>
                            P&L: {formatMoney(pnl, true, currency)}
                          </div>
                          <div>Positions: {trades}</div>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={40}>
                {chartSeries.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={
                      entry.pnl === 0
                        ? "transparent"
                        : entry.pnl >= 0
                          ? "#10b981"
                          : "#f43f5e"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>

          {bestDay && worstDay ? (
            <p className="text-[11px] text-muted-foreground">
              {filteredDaily.length} session{filteredDaily.length === 1 ? "" : "s"} in
              period · Best day {formatMoney(bestDay.pnl, true, currency)} on{" "}
              {format(parseISO(bestDay.date), "MMM d")} · Worst day{" "}
              {formatMoney(worstDay.pnl, true, currency)} on{" "}
              {format(parseISO(worstDay.date), "MMM d")}.
            </p>
          ) : null}
        </div>
      )}
    </DataPanel>
  );
});
