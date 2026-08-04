"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
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
import { TimeframeSegmentedControl } from "@/components/analytics/timeframe-segmented-control";
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
  isActivePositionTodayPnlPending,
  patchTodayDailyFromQuotes,
  toActivePositionPnlInput,
} from "@/lib/active-position-daily-pnl";
import {
  analyticsPeriodBadge,
  emptyAnalyticsFilters,
  formatMoney,
  getAnalyticsTimeframeRange,
  type AnalyticsFilters,
  type DailyPnlPoint,
} from "@/lib/analytics";
import { defaultListingMarketForCurrency } from "@/lib/equity-listing-markets";
import { sessionCloseDescription } from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

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

function filterDailyByTimeframe(
  daily: DailyPnlPoint[],
  filters: AnalyticsFilters
): DailyPnlPoint[] {
  const { from, to } = getAnalyticsTimeframeRange(filters);
  return daily.filter((point) => {
    const date = parseISO(point.date);
    if (from && isBefore(date, startOfDay(from))) return false;
    if (to && isAfter(date, endOfDay(to))) return false;
    return true;
  });
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-base font-semibold",
          NUMERIC_CLASS,
          tone === "profit" && "text-emerald-600 dark:text-emerald-400",
          tone === "loss" && "text-rose-600 dark:text-rose-400",
          tone === "neutral" && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PnlChartCard({ trades, currency }: PnlChartCardProps) {
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
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const isMobile = useIsMobile();

  const activePool = useMemo(
    () => trades.filter((trade) => (trade.status ?? "Closed") === "Active"),
    [trades]
  );

  const { getQuote, loading: quotesLoading, fetchedAt } = useMarketQuotes();

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
        setError(null);
        return;
      }

      setLoading(true);
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
        setDaily(data.daily ?? []);
        setPriorSessionBarByTradeId(data.priorSessionBarByTradeId ?? {});
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Could not load active position P&L"
        );
        setDaily([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTrades, currency]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchDailyPnl(controller.signal);
    return () => controller.abort();
  }, [fetchDailyPnl, activeTradesKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!todayPending || activeTrades.length === 0) return;

    const timer = window.setInterval(() => {
      void fetchDailyPnl();
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
    fetchedAt,
    getQuote,
    now,
    priorSessionBarByTradeId,
    quotesLoading,
  ]);

  const filteredDaily = useMemo(() => {
    const points = filterDailyByTimeframe(dailyWithQuotes, filters).map((point) => ({
      ...point,
      label: format(parseISO(point.date), "MMM d"),
    }));
    return points;
  }, [dailyWithQuotes, filters]);

  const netPnl = useMemo(
    () =>
      Math.round(
        filteredDaily.reduce((sum, point) => sum + point.pnl, 0) * 100
      ) / 100,
    [filteredDaily]
  );

  const todayPnl = useMemo(
    () => activePositionTodayPnl(dailyWithQuotes, activeTrades, currency, now),
    [dailyWithQuotes, activeTrades, currency, now]
  );

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
    () => paddedDomain(filteredDaily.map((point) => point.pnl)),
    [filteredDaily]
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

  return (
    <DataPanel
      title="P&L chart"
      subtitle="Daily mark-to-market P&L on your open positions"
      meta={
        loading || quotesLoading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            Loading
          </span>
        ) : (
          `${activeTrades.length} open`
        )
      }
      action={
        <div className="max-w-[min(100vw-3rem,28rem)] overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TimeframeSegmentedControl
            value={filters.timeframe}
            onChange={(timeframe) =>
              setFilters((current) => ({ ...current, timeframe }))
            }
            trailing={datePicker}
          />
        </div>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Period P&L"
              value={formatMoney(netPnl, true, currency)}
              tone={netPnl > 0 ? "profit" : netPnl < 0 ? "loss" : "neutral"}
            />
            <Stat
              label="Today"
              value={
                todayPending
                  ? "Pending"
                  : todayPnl != null
                    ? formatMoney(todayPnl, true, currency)
                    : "—"
              }
              tone={
                todayPending || todayPnl == null
                  ? "neutral"
                  : todayPnl > 0
                    ? "profit"
                    : todayPnl < 0
                      ? "loss"
                      : "neutral"
              }
            />
            <Stat label="Open positions" value={String(activeTrades.length)} />
            <Stat
              label="Period"
              value={analyticsPeriodBadge(filters)}
              tone="neutral"
            />
          </div>

          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart
              data={filteredDaily}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
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
                minTickGap={24}
                className="text-[10px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={52}
                domain={yDomain}
                tickCount={5}
                tickFormatter={(value) =>
                  formatMoney(Number(value), false, currency)
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
                        | { trades?: number }
                        | undefined;
                      return (
                        <div className="space-y-0.5">
                          <div>
                            P&L: {formatMoney(Number(value), true, currency)}
                          </div>
                          <div>
                            Positions: {row?.trades ?? 0}
                          </div>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={40}>
                {filteredDaily.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>

          {bestDay && worstDay ? (
            <p className="text-[11px] text-muted-foreground">
              Best day {formatMoney(bestDay.pnl, true, currency)} on{" "}
              {format(parseISO(bestDay.date), "MMM d")} · Worst day{" "}
              {formatMoney(worstDay.pnl, true, currency)} on{" "}
              {format(parseISO(worstDay.date), "MMM d")}.
            </p>
          ) : null}
        </div>
      )}
    </DataPanel>
  );
}
