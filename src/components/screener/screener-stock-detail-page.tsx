"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, LineChart as LineChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openNseTradingViewDailyChart } from "@/lib/tradingview";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { AppPageHeader } from "@/components/app-page-header";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { useJournalTrades } from "@/components/journal-trades-provider";
import { ScreenerChange } from "@/components/screener/screener-change";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScreenerJson } from "@/hooks/use-screener-json";
import {
  computeWinLossStats,
  formatMoney,
  formatPercent,
} from "@/lib/analytics";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { formatMarketPrice } from "@/lib/journal-types";
import { emaSeries } from "@/lib/screener/ema";
import { chartForPeriod } from "@/lib/screener/format";
import { screenerTabHref, type ScreenerTab } from "@/lib/screener/tabs";
import { computeScreenerStrength } from "@/lib/screener/strength";
import { ScreenerStrength } from "@/components/screener/screener-strength";
import {
  SCREENER_PERIODS,
  SCREENER_PERIOD_LABELS,
  type ScreenerPeriod,
  type StockScreenerDetail,
} from "@/lib/screener/types";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const chartConfig = {
  close: { label: "Price", color: "var(--chart-1)" },
  ema200: { label: "200 EMA", color: "var(--chart-2)" },
} satisfies ChartConfig;

function backLink(from?: ScreenerTab, sectorId?: string | null, sectorLabel?: string | null) {
  if (from === "ema") {
    return { href: screenerTabHref("ema"), label: "Back to EMA support" };
  }
  if (from === "turtle") {
    return { href: screenerTabHref("turtle"), label: "Back to Turtle breakout" };
  }
  if (sectorId) {
    return {
      href: `/screener/${sectorId}`,
      label: sectorLabel ? `Back to ${sectorLabel}` : "Back to sector",
    };
  }
  return { href: "/screener", label: "Back to screener" };
}

export function ScreenerStockDetailPage({
  ticker,
  sectorId,
  from,
}: {
  ticker: string;
  sectorId?: string;
  from?: ScreenerTab;
}) {
  const { trades } = useJournalTrades();
  const query = sectorId
    ? `?sectorId=${encodeURIComponent(sectorId)}`
    : "";
  const { data, error, loading } = useScreenerJson<StockScreenerDetail>(
    `/api/screener/stocks/${encodeURIComponent(ticker)}${query}`
  );
  const [period, setPeriod] = useState<ScreenerPeriod>("1y");

  const journalTrades = useMemo(() => {
    const key = normalizeEquityTicker(ticker);
    return trades.filter(
      (trade) =>
        trade.assetClass === "Equities" &&
        normalizeEquityTicker(trade.ticker) === key &&
        trade.status === "Closed"
    );
  }, [ticker, trades]);

  const journalStats = useMemo(
    () => computeWinLossStats(journalTrades),
    [journalTrades]
  );

  const chart = useMemo(() => {
    if (!data) return [];
    const ema200 = emaSeries(
      data.chart.map((point) => point.close),
      200
    );
    return chartForPeriod(
      data.chart.map((point, index) => ({
        ...point,
        ema200:
          ema200[index] != null
            ? Math.round(ema200[index]! * 100) / 100
            : null,
      })),
      period
    );
  }, [data, period]);

  const strength = useMemo(
    () =>
      data
        ? computeScreenerStrength({
            changes: data.changes,
            vsPeer: data.vsSector,
            vsBenchmark: data.vsNifty,
          })
        : null,
    [data]
  );
  const back = backLink(from, data?.sectorId ?? sectorId, data?.sectorLabel);

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <div>
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {back.label}
        </Link>
        <AppPageHeader
          eyebrow={
            data?.sectorLabel
              ? `Screener · ${data.sectorLabel}`
              : "Screener"
          }
          title={data?.ticker ?? ticker.toUpperCase()}
          description={data?.name}
          pageActions={
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() =>
                openNseTradingViewDailyChart(data?.ticker ?? ticker)
              }
            >
              <LineChartIcon className="size-3.5" />
              TradingView
            </Button>
          }
        />
      </div>

      {error ? (
        <PanelEmpty title="Could not load this stock" hint={error} />
      ) : loading && !data ? (
        <div className="min-h-[22rem] animate-pulse rounded-xl bg-muted/40" />
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat
              label="Last price"
              value={
                data.lastPrice != null
                  ? formatMarketPrice(data.lastPrice, "INR")
                  : "—"
              }
            />
            <Stat
              label={`${SCREENER_PERIOD_LABELS[period]} change`}
              value={<ScreenerChange value={data.changes[period]} />}
            />
            <Stat
              label={`vs ${data.sectorLabel ?? "sector"}`}
              value={
                data.vsSector ? (
                  <ScreenerChange value={data.vsSector[period]} />
                ) : (
                  "—"
                )
              }
            />
            <Stat
              label="vs Nifty 50"
              value={<ScreenerChange value={data.vsNifty[period]} />}
            />
            <Stat
              label="Strength"
              value={
                <span className="inline-flex items-baseline gap-1.5">
                  <ScreenerStrength score={strength?.score} compact />
                  {strength ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {strength.label}
                    </span>
                  ) : null}
                </span>
              }
            />
          </div>
          {strength?.why ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Why: </span>
              {strength.why}
            </p>
          ) : null}

          <DataPanel
            title="Price"
            subtitle="Daily closes with 200 EMA for the selected lookback"
            action={
              <div className="overflow-x-auto">
                <Tabs
                  value={period}
                  onValueChange={(value) => {
                    if (SCREENER_PERIODS.includes(value as ScreenerPeriod)) {
                      setPeriod(value as ScreenerPeriod);
                    }
                  }}
                >
                  <TabsList className="h-9">
                    {SCREENER_PERIODS.map((item) => (
                      <TabsTrigger
                        key={item}
                        value={item}
                        className="px-2 text-[11px]"
                      >
                        {SCREENER_PERIOD_LABELS[item]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            }
          >
            {chart.length < 2 ? (
              <PanelEmpty
                title="No chart history"
                hint="Yahoo did not return enough daily closes for this symbol."
              />
            ) : (
              <ChartContainer config={chartConfig} className="h-[240px] w-full">
                <LineChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="2 4"
                    className="stroke-border/60"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                    tickFormatter={(value) => String(value).slice(5)}
                    className="text-[10px]"
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickFormatter={(value) =>
                      formatMarketPrice(Number(value), "INR")
                    }
                    className="text-[10px]"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="var(--color-close)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ema200"
                    stroke="var(--color-ema200)"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ChartContainer>
            )}
          </DataPanel>

          <DataPanel title="Returns" subtitle="Same horizons as the sector matrix">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SCREENER_PERIODS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    period === item
                      ? "border-primary/30 bg-primary/10"
                      : "border-border/70 bg-muted/20 hover:bg-muted/40"
                  )}
                >
                  <p className="text-[11px] text-muted-foreground">
                    {SCREENER_PERIOD_LABELS[item]}
                  </p>
                  <ScreenerChange
                    value={data.changes[item]}
                    className="text-base font-semibold"
                  />
                </button>
              ))}
            </div>
            {data.sectorRank && data.sectorCount ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Sector rank on {SCREENER_PERIOD_LABELS[period]}:{" "}
                {data.sectorRank[period] ?? "—"} of {data.sectorCount}
              </p>
            ) : null}
          </DataPanel>

          <DataPanel
            title="Your journal"
            subtitle="Closed equity trades in this ticker"
            meta={`${journalTrades.length} trades`}
          >
            {journalTrades.length === 0 ? (
              <PanelEmpty
                title="No closed trades yet"
                hint="When you log this stock in the journal, win rate and P&L will show up here."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Win rate"
                  value={formatPercent(
                    journalStats.winCount + journalStats.lossCount
                      ? (journalStats.winCount /
                          (journalStats.winCount + journalStats.lossCount)) *
                        100
                      : 0
                  )}
                />
                <Stat
                  label="Net P&L"
                  value={formatMoney(
                    journalStats.grossProfit - journalStats.grossLoss,
                    true,
                    "INR"
                  )}
                />
                <Stat
                  label="Wins / losses"
                  value={`${journalStats.winCount}W / ${journalStats.lossCount}L`}
                />
                <Stat
                  label="Largest win"
                  value={formatMoney(journalStats.largestWin, true, "INR")}
                />
              </div>
            )}
          </DataPanel>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className={cn("mt-0.5 truncate text-lg font-semibold", NUMERIC_CLASS)}>
        {value}
      </div>
    </div>
  );
}
