"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatMoney,
  formatPf,
  type HeatCell,
  type StrategyMetric,
  type WinLossStats,
} from "@/lib/analytics";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const SESSIONS = ["Open", "Midday", "Power Hour"] as const;

const timingConfig = {
  pnl: { label: "P&L", color: "#10b981" },
} satisfies ChartConfig;

const strategyConfig = {
  totalPnl: { label: "P&L", color: "#10b981" },
} satisfies ChartConfig;

function pnlDomain(values: number[]): [number, number] {
  if (values.length === 0) return [-1, 1];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(max - min, 5);
  const pad = span * 0.2;
  return [min - pad, max + pad];
}

function aggregateBySession(heatmap: HeatCell[]) {
  return SESSIONS.map((session) => {
    const cells = heatmap.filter((h) => h.session === session);
    return {
      label: session,
      pnl: cells.reduce((s, c) => s + c.pnl, 0),
      trades: cells.reduce((s, c) => s + c.trades, 0),
    };
  });
}

function aggregateByDay(heatmap: HeatCell[]) {
  return DAYS.map((day) => {
    const cells = heatmap.filter((h) => h.day === day);
    return {
      label: day,
      pnl: cells.reduce((s, c) => s + c.pnl, 0),
      trades: cells.reduce((s, c) => s + c.trades, 0),
    };
  });
}

export function WinLossCard({ winLoss }: { winLoss: WinLossStats }) {
  const total =
    winLoss.winCount + winLoss.lossCount + winLoss.breakevenCount;
  const winRate = total ? (winLoss.winCount / total) * 100 : 0;

  const hasTrades = total > 0;

  const winShare = total ? (winLoss.winCount / total) * 100 : 0;
  const lossShare = total ? (winLoss.lossCount / total) * 100 : 0;
  const beShare = total ? (winLoss.breakevenCount / total) * 100 : 0;

  return (
    <Card className="h-full border-border bg-card shadow-none">
      <CardHeader className="border-b border-border py-3 pb-3">
        <CardTitle className="text-base font-semibold">
          Win/loss & expectancy
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs">
          Outcome mix and per-trade edge
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {!hasTrades ? (
          <TimingEmpty className="h-[220px]" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Win rate
                </p>
                <p className={cn("mt-1 text-2xl font-semibold text-foreground", NUMERIC_CLASS)}>
                  {winRate.toFixed(0)}
                  <span className="text-base font-medium text-muted-foreground">
                    %
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {winLoss.winCount}W · {winLoss.lossCount}L
                  {winLoss.breakevenCount > 0
                    ? ` · ${winLoss.breakevenCount}BE`
                    : ""}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg border px-3 py-3",
                  winLoss.expectancy >= 0
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-rose-500/25 bg-rose-500/5"
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Expectancy
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-semibold",
                    NUMERIC_CLASS,
                    winLoss.expectancy >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-400"
                  )}
                >
                  {formatMoney(winLoss.expectancy)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Expected P&L per closed trade
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Outcome distribution</span>
                <span>{total} trades</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                {winShare > 0 ? (
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${winShare}%` }}
                    title={`Wins ${winLoss.winCount}`}
                  />
                ) : null}
                {beShare > 0 ? (
                  <div
                    className="h-full bg-slate-400"
                    style={{ width: `${beShare}%` }}
                    title={`Breakeven ${winLoss.breakevenCount}`}
                  />
                ) : null}
                {lossShare > 0 ? (
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${lossShare}%` }}
                    title={`Losses ${winLoss.lossCount}`}
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Wins {winLoss.winCount}
                </span>
                {winLoss.breakevenCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-slate-400" />
                    Breakeven {winLoss.breakevenCount}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500" />
                  Losses {winLoss.lossCount}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MetricPanel
                title="Winning trades"
                accent="emerald"
                rows={[
                  { label: "Gross profit", value: formatMoney(winLoss.grossProfit) },
                  { label: "Average win", value: formatMoney(winLoss.avgWin) },
                  { label: "Largest win", value: formatMoney(winLoss.largestWin) },
                ]}
              />
              <MetricPanel
                title="Losing trades"
                accent="rose"
                rows={[
                  {
                    label: "Gross loss",
                    value: formatMoney(-winLoss.grossLoss),
                  },
                  { label: "Average loss", value: formatMoney(winLoss.avgLoss) },
                  {
                    label: "Largest loss",
                    value: formatMoney(winLoss.largestLoss),
                  },
                ]}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MetricPanel({
  title,
  accent,
  rows,
}: {
  title: string;
  accent: "emerald" | "rose";
  rows: { label: string; value: string }[];
}) {
  const border =
    accent === "emerald" ? "border-emerald-500/20" : "border-rose-500/20";
  const bar = accent === "emerald" ? "bg-emerald-500" : "bg-rose-500";
  const valueClass =
    accent === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-700 dark:text-rose-400";

  return (
    <div className={cn("rounded-lg border bg-muted/10 p-3", border)}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("h-3.5 w-0.5 rounded-full", bar)} />
        <p className="text-xs font-semibold text-foreground">{title}</p>
      </div>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-2 text-xs"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                "font-semibold",
                NUMERIC_CLASS,
                valueClass
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TimingBarChart({
  data,
}: {
  data: { label: string; pnl: number; trades: number }[];
}) {
  const domain = useMemo(
    () => pnlDomain(data.map((d) => d.pnl)),
    [data]
  );
  const hasActivity = data.some((d) => d.trades > 0);

  if (!hasActivity) {
    return <TimingEmpty className="h-[160px]" />;
  }

  return (
    <ChartContainer config={timingConfig} className="h-[160px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 4 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fontSize: 10 }}
          domain={domain}
          tickFormatter={(v) => formatMoney(Number(v), false)}
        />
        <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _n, item) => {
                const row = item?.payload as
                  | { label: string; trades: number }
                  | undefined;
                return (
                  <div className="space-y-0.5">
                    <div className="font-medium">{row?.label}</div>
                    <div>P&L: {formatMoney(Number(value))}</div>
                    <div>{row?.trades ?? 0} trades</div>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((d) => (
            <Cell
              key={d.label}
              fill={d.pnl >= 0 ? "#10b981" : "#f43f5e"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function ExecutionTimingCard({ heatmap }: { heatmap: HeatCell[] }) {
  const bySession = useMemo(() => aggregateBySession(heatmap), [heatmap]);
  const byDay = useMemo(() => aggregateByDay(heatmap), [heatmap]);

  return (
    <Card className="h-full border-border bg-card shadow-none">
      <CardHeader className="border-b border-border py-3 pb-3">
        <CardTitle className="text-base font-semibold">
          When you trade
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs">
          Net P&L by session and weekday
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue="session">
          <TabsList className="mb-3 h-8 bg-muted p-0.5">
            <TabsTrigger
              value="session"
              className="h-7 px-2.5 text-xs data-active:font-semibold"
            >
              By session
            </TabsTrigger>
            <TabsTrigger
              value="weekday"
              className="h-7 px-2.5 text-xs data-active:font-semibold"
            >
              By weekday
            </TabsTrigger>
          </TabsList>
          <TabsContent value="session" className="mt-0">
            <TimingBarChart data={bySession} />
          </TabsContent>
          <TabsContent value="weekday" className="mt-0">
            <TimingBarChart data={byDay} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function StrategyCard({ strategies }: { strategies: StrategyMetric[] }) {
  const strategyChartData = strategies.map((s) => ({
    ...s,
    label:
      s.strategy.length > 14 ? `${s.strategy.slice(0, 13)}…` : s.strategy,
    lossCount: Math.max(0, s.trades - s.wins),
  }));

  const strategyPnlDomain = useMemo(
    () => pnlDomain(strategies.map((s) => s.totalPnl)),
    [strategies]
  );

  const maxAbsPnl = Math.max(
    ...strategies.map((s) => Math.abs(s.totalPnl)),
    1
  );

  return (
    <Card className="h-full border-border bg-card shadow-none">
      <CardHeader className="border-b border-border py-3 pb-3">
        <CardTitle className="text-base font-semibold">
          Strategy breakdown
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs">
          Net P&L, win rate, and outcome mix by setup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {strategies.length === 0 ? (
          <StrategyEmpty />
        ) : (
          <>
            <ChartContainer config={strategyConfig} className="h-[180px] w-full">
              <BarChart
                data={strategyChartData}
                margin={{ left: 4, right: 4, top: 8, bottom: 4 }}
                barCategoryGap="28%"
              >
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
                  width={44}
                  tick={{ fontSize: 10 }}
                  domain={strategyPnlDomain}
                  tickFormatter={(v) => formatMoney(Number(v), false)}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _n, item) => {
                        const row = item?.payload as StrategyMetric | undefined;
                        if (!row) return null;
                        return (
                          <div className="space-y-0.5">
                            <div className="font-medium">{row.strategy}</div>
                            <div>P&L: {formatMoney(Number(value))}</div>
                            <div>
                              {row.trades} trades · {row.winRate.toFixed(0)}%
                              win rate
                            </div>
                            <div>PF: {formatPf(row.profitFactor)}</div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {strategyChartData.map((s) => (
                    <Cell
                      key={s.strategy}
                      fill={s.totalPnl >= 0 ? "#10b981" : "#f43f5e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="space-y-2 border-t border-border pt-3">
              {strategyChartData.map((s) => (
                <div
                  key={s.strategy}
                  className="rounded-lg border border-border bg-muted/15 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.strategy}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.trades} trades · {s.wins}W / {s.lossCount}L · PF{" "}
                        {formatPf(s.profitFactor)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-semibold",
                        NUMERIC_CLASS,
                        s.totalPnl >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-700 dark:text-rose-400"
                      )}
                    >
                      {formatMoney(s.totalPnl)}
                    </p>
                  </div>
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${(s.wins / Math.max(s.trades, 1)) * 100}%`,
                      }}
                    />
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{
                        width: `${(s.lossCount / Math.max(s.trades, 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        s.totalPnl >= 0
                          ? "bg-emerald-500/80"
                          : "bg-rose-500/80"
                      )}
                      style={{
                        width: `${(Math.abs(s.totalPnl) / maxAbsPnl) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** @deprecated Use individual cards from the dashboard layout */
export function BreakdownGrid({
  winLoss,
  strategies,
  heatmap,
}: {
  winLoss: WinLossStats;
  strategies: StrategyMetric[];
  heatmap: HeatCell[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <WinLossCard winLoss={winLoss} />
      <StrategyCard strategies={strategies} />
      <ExecutionTimingCard heatmap={heatmap} />
    </div>
  );
}

function TimingEmpty({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground",
        className
      )}
    >
      No trades in this period
    </div>
  );
}

function StrategyEmpty() {
  return (
    <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
      No strategy data for this filter set
    </div>
  );
}
