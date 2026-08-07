"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  dashboardAnalyticsCardClass,
  dashboardAnalyticsContentClass,
  dashboardAnalyticsDescriptionClass,
  dashboardAnalyticsHeaderClass,
  dashboardAnalyticsTitleClass,
  dashboardChartBodyMinClass,
} from "@/components/analytics/dashboard-card-layout";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatMoney,
  type DailyPnlPoint,
  type EquityPoint,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

const CHART_BODY_CLASS = `aspect-auto ${dashboardChartBodyMinClass}`;

const weeklyConfig = {
  pnl: { label: "Weekly P&L", color: "#64748b" },
} satisfies ChartConfig;

/** Beyond this count, weekly bars scroll horizontally instead of squeezing */
const WEEKLY_SCROLL_AFTER = 12;
const WEEKLY_BAR_SLOT_PX = 52;

function weeklyPlotWidth(pointCount: number) {
  return Math.max(pointCount * WEEKLY_BAR_SLOT_PX, 300);
}

function weekAxisInterval(pointCount: number) {
  if (pointCount <= 10) return 0;
  if (pointCount <= 20) return 1;
  return Math.max(1, Math.floor(pointCount / 8));
}

function formatWeekTick(dateKey: string) {
  return format(parseISO(dateKey), "MMM d");
}

function formatWeekTooltipLabel(dateKey: string) {
  return `Week of ${format(parseISO(dateKey), "MMM d, yyyy")}`;
}

function WeeklyPnlTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: DailyPnlPoint; value?: number }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const pnl = Number(payload[0]?.value ?? row.pnl);
  const pnlUp = pnl > 0;
  const pnlDown = pnl < 0;

  return (
    <div className="z-50 min-w-[12.5rem] rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-md">
      <p className="mb-2 font-semibold text-foreground">
        {formatWeekTooltipLabel(row.date)}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">P&L</span>
          <span
            className={cn(
              "font-medium tabular-nums",
              pnlUp && "text-emerald-600 dark:text-emerald-400",
              pnlDown && "text-rose-600 dark:text-rose-400",
              !pnlUp && !pnlDown && "text-foreground"
            )}
          >
            {formatMoney(pnl)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Trades</span>
          <span className="font-medium tabular-nums text-foreground">
            {row.trades}
          </span>
        </div>
      </div>
    </div>
  );
}

function WeeklyPnlChart({
  data,
  domain,
}: {
  data: DailyPnlPoint[];
  domain: [number, number];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const needsScroll = data.length > WEEKLY_SCROLL_AFTER;
  const plotWidth = needsScroll ? weeklyPlotWidth(data.length) : undefined;
  const xInterval = weekAxisInterval(data.length);

  useEffect(() => {
    if (!needsScroll || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [data, needsScroll]);

  return (
    <div className="flex flex-col gap-1.5">
      {needsScroll ? (
        <p className="text-[10px] text-muted-foreground">
          {data.length} weeks — scroll for earlier periods (latest on the right)
        </p>
      ) : null}
      <div
        ref={scrollRef}
        className={cn(
          CHART_BODY_CLASS,
          needsScroll &&
            "overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]"
        )}
      >
        <ChartContainer
          config={weeklyConfig}
          className={cn(
            "aspect-auto h-full min-h-[9.5rem] w-full [&_svg]:outline-none [&_svg_*]:outline-none",
            needsScroll && "min-w-0"
          )}
          style={needsScroll ? { width: plotWidth, minWidth: "100%" } : undefined}
        >
          <BarChart
            accessibilityLayer={false}
            data={data}
            margin={{ left: 4, right: needsScroll ? 12 : 4, top: 8, bottom: 0 }}
            barCategoryGap={needsScroll ? "20%" : "28%"}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatWeekTick(String(v))}
              interval={xInterval}
              minTickGap={needsScroll ? 8 : 16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={76}
              tick={{ fontSize: 10 }}
              domain={domain}
              tickCount={5}
              tickFormatter={(v) => formatMoney(Number(v), true)}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
            <ChartTooltip cursor={false} content={<WeeklyPnlTooltip />} />
            <Bar
              dataKey="pnl"
              radius={[4, 4, 0, 0]}
              maxBarSize={needsScroll ? 32 : 48}
              isAnimationActive={false}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"}
                  stroke="none"
                  strokeWidth={0}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

interface MainChartsProps {
  equity: EquityPoint[];
  weeklyPnl: DailyPnlPoint[];
}

const cumulativeConfig = {
  cumulative: { label: "Cumulative P&L", color: "#10b981" },
} satisfies ChartConfig;

const ddConfig = {
  drawdown: { label: "Drawdown", color: "#f43f5e" },
} satisfies ChartConfig;

function paddedDomain(
  values: number[],
  options?: { floorZero?: boolean; minSpan?: number }
): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, options?.minSpan ?? 1);
  const pad = Math.max(span * 0.2, 1);
  let lo = min - pad;
  let hi = max + pad;
  if (options?.floorZero && lo > 0 && min >= 0) lo = 0;
  if (options?.floorZero && hi < 0 && max <= 0) hi = 0;
  return [lo, hi];
}

export function MainCharts({ equity, weeklyPnl }: MainChartsProps) {
  const baseline = equity[0]?.equity ?? 0;

  const cumulative = useMemo(
    () =>
      equity.map((p) => ({
        date: p.date,
        cumulative: Math.round((p.equity - baseline) * 100) / 100,
      })),
    [equity, baseline]
  );

  const cumulativeDomain = useMemo(
    () =>
      paddedDomain(
        cumulative.map((p) => p.cumulative),
        { minSpan: 10 }
      ),
    [cumulative]
  );

  const weeklyDomain = useMemo(
    () =>
      paddedDomain(
        weeklyPnl.map((p) => p.pnl),
        { floorZero: true, minSpan: 5 }
      ),
    [weeklyPnl]
  );

  const defaultTab = weeklyPnl.length > 0 ? "weekly" : "cumulative";
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <Card className={dashboardAnalyticsCardClass}>
      <CardHeader className={dashboardAnalyticsHeaderClass}>
        <CardTitle className={dashboardAnalyticsTitleClass}>
          Performance overview
        </CardTitle>
        <CardDescription className={dashboardAnalyticsDescriptionClass}>
          Weekly results and cumulative net P&L for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent className={dashboardAnalyticsContentClass}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-3 h-8 w-full shrink-0 justify-start bg-muted p-0.5 sm:w-auto">
            <TabsTrigger
              value="weekly"
              className="h-7 px-2.5 text-xs data-active:font-semibold"
            >
              Weekly P&L
            </TabsTrigger>
            <TabsTrigger
              value="cumulative"
              className="h-7 px-2.5 text-xs data-active:font-semibold"
            >
              Cumulative P&L
            </TabsTrigger>
            <TabsTrigger
              value="drawdown"
              className="h-7 px-2.5 text-xs data-active:font-semibold"
            >
              Drawdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-0">
            {activeTab === "weekly" ? (
              weeklyPnl.length === 0 ? (
                <EmptyChart />
              ) : (
                <WeeklyPnlChart data={weeklyPnl} domain={weeklyDomain} />
              )
            ) : null}
          </TabsContent>

          <TabsContent value="cumulative" className="mt-0">
            {activeTab === "cumulative" ? (
              cumulative.length < 2 ? (
                <EmptyChart />
              ) : (
                <ChartContainer
                  config={cumulativeConfig}
                  className={CHART_BODY_CLASS}
                >
                  <LineChart data={cumulative} margin={{ left: 4, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => String(v).slice(5)}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tick={{ fontSize: 10 }}
                      domain={cumulativeDomain}
                      tickFormatter={(v) => formatMoney(Number(v), false)}
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => (
                            <span>Net: {formatMoney(Number(value))}</span>
                          )}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#10b981" }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ChartContainer>
              )
            ) : null}
          </TabsContent>

          <TabsContent value="drawdown" className="mt-0">
            {activeTab === "drawdown" ? (
              equity.length < 2 ? (
                <EmptyChart />
              ) : (
                <ChartContainer
                  config={ddConfig}
                  className={CHART_BODY_CLASS}
                >
                  <AreaChart data={equity} margin={{ left: 4, right: 4, top: 4 }}>
                    <defs>
                      <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => String(v).slice(5)}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => formatMoney(Number(v), false)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => {
                            const payload = item?.payload as EquityPoint | undefined;
                            return (
                              <div>
                                DD: {formatMoney(Number(value))} (
                                {payload?.drawdownPct.toFixed(2)}%)
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#f43f5e"
                      fill="url(#ddFill)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ChartContainer>
              )
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div
      className={`flex ${dashboardChartBodyMinClass} items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground`}
    >
      No closed trades in the selected range
    </div>
  );
}
