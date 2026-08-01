import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { formatSignedMoney } from "@/lib/journal-types";

export type AnalyticsTimeframe =
  | "today"
  | "yesterday"
  | "3d"
  | "7d"
  | "30d"
  | "3m"
  | "ytd"
  | "all"
  | "custom";

export const DASHBOARD_TIMEFRAME_OPTIONS: {
  value: AnalyticsTimeframe;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "3d", label: "3D" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "3m", label: "3M" },
  { value: "ytd", label: "YTD" },
  { value: "all", label: "All" },
  { value: "custom", label: "Custom" },
];

export interface AnalyticsFilters {
  timeframe: AnalyticsTimeframe;
  customFrom?: Date;
  customTo?: Date;
}

export function emptyAnalyticsFilters(): AnalyticsFilters {
  return {
    timeframe: "ytd",
  };
}

/** Short label for analytics card headers (period / year). */
export function analyticsPeriodBadge(
  filters: AnalyticsFilters,
  now = new Date()
): string {
  if (filters.timeframe === "ytd") return String(now.getFullYear());
  if (filters.timeframe === "all") return "All time";
  if (filters.timeframe === "today") return "Today";
  if (filters.timeframe === "yesterday") return "Yesterday";
  if (filters.timeframe === "3d") return "3D";
  if (filters.timeframe === "7d") return "7D";
  if (filters.timeframe === "30d") return "30D";
  if (filters.timeframe === "3m") return "3M";
  if (filters.timeframe === "custom") {
    if (filters.customFrom || filters.customTo) {
      return `${filters.customFrom ? format(filters.customFrom, "MMM d") : "…"} – ${
        filters.customTo ? format(filters.customTo, "MMM d, yyyy") : "…"
      }`;
    }
    return "Custom";
  }
  return String(now.getFullYear());
}

export interface EquityPoint {
  date: string;
  equity: number;
  benchmark: number;
  drawdown: number;
  drawdownPct: number;
}

export interface DailyPnlPoint {
  date: string;
  pnl: number;
  trades: number;
}

export interface StrategyMetric {
  strategy: string;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  profitFactor: number;
  avgDurationHours: number;
  maxDrawdown: number;
}

export interface HeatCell {
  day: string;
  session: string;
  pnl: number;
  trades: number;
}

export interface DurationBucket {
  bucket: string;
  avgReturn: number;
  trades: number;
  totalPnl: number;
}

export interface AnalyticsKpis {
  netPnl: number;
  returnPct: number;
  profitFactor: number;
  winRate: number;
  wins: number;
  losses: number;
  totalWinAmount: number;
  totalLossAmount: number;
  avgRr: string;
  maxDrawdown: number;
  maxDrawdownPct: number;
}

export interface WinLossStats {
  grossProfit: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  expectancy: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
}

export interface PnlBreakdownStats extends WinLossStats {
  netPnl: number;
  bestTradeTicker: string;
  worstTradeTicker: string;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

export interface MonthlyPerformancePoint {
  monthKey: string;
  label: string;
  monthTitle: string;
  returnPct: number;
  monthPnl: number;
  stats: PeriodTradeStats;
}

export interface PeriodTradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  accuracyPct: number;
  totalWinAmount: number;
  totalLossAmount: number;
  riskRewardLabel: string;
}

export type PerformanceGranularity = "monthly" | "weekly" | "daily";


function tradeTime(trade: JournalTrade) {
  return parseISO(trade.exitDate || trade.entryDate);
}

export function getAnalyticsTimeframeRange(
  filters: Pick<AnalyticsFilters, "timeframe" | "customFrom" | "customTo">,
  now = new Date()
): { from?: Date; to?: Date } {
  if (filters.timeframe === "custom") {
    return { from: filters.customFrom, to: filters.customTo };
  }
  if (filters.timeframe === "all") return {};
  if (filters.timeframe === "today") {
    return { from: startOfDay(now), to: now };
  }
  if (filters.timeframe === "yesterday") {
    const day = subDays(now, 1);
    return { from: startOfDay(day), to: endOfDay(day) };
  }
  if (filters.timeframe === "3d") return { from: subDays(now, 3), to: now };
  if (filters.timeframe === "7d") return { from: subDays(now, 7), to: now };
  if (filters.timeframe === "30d") return { from: subDays(now, 30), to: now };
  if (filters.timeframe === "3m") return { from: subDays(now, 90), to: now };
  // ytd
  return { from: new Date(now.getFullYear(), 0, 1), to: now };
}

export function filterAnalyticsTrades(
  trades: JournalTrade[],
  filters: AnalyticsFilters
): JournalTrade[] {
  const { from, to } = getAnalyticsTimeframeRange(filters);

  return trades.filter((trade) => {
    if (trade.status === "Active") return false;

    const t = tradeTime(trade);
    if (from && isBefore(t, startOfDay(from))) return false;
    if (to && isAfter(t, to)) return false;
    return true;
  });
}

function parseRr(rr: string): number | null {
  const match = rr.match(/([\d.]+)\s*:\s*([\d.]+)/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!a || !b) return null;
  return b / a;
}

export function computeKpis(
  trades: JournalTrade[],
  startingEquity = 10000
): AnalyticsKpis {
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter((t) => t.outcome === "Win");
  const losses = trades.filter((t) => t.outcome === "Loss");
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor =
    grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;

  const rrValues = trades
    .map((t) => parseRr(t.riskReward))
    .filter((v): v is number => v !== null);
  const avgRrNum =
    rrValues.length === 0
      ? 0
      : rrValues.reduce((a, b) => a + b, 0) / rrValues.length;

  const { maxDrawdown, maxDrawdownPct } = computeEquitySeries(
    trades,
    startingEquity
  ).reduce(
    (acc, p) => ({
      maxDrawdown: Math.min(acc.maxDrawdown, p.drawdown),
      maxDrawdownPct: Math.min(acc.maxDrawdownPct, p.drawdownPct),
    }),
    { maxDrawdown: 0, maxDrawdownPct: 0 }
  );

  return {
    netPnl,
    returnPct: startingEquity ? (netPnl / startingEquity) * 100 : 0,
    profitFactor,
    winRate,
    wins: wins.length,
    losses: losses.length,
    totalWinAmount: grossProfit,
    totalLossAmount: grossLoss,
    avgRr: avgRrNum
      ? `1:${trimTrailingZeros(avgRrNum.toFixed(1))}`
      : "—",
    maxDrawdown,
    maxDrawdownPct,
  };
}

export function computeEquitySeries(
  trades: JournalTrade[],
  startingEquity = 10000
): EquityPoint[] {
  const sorted = [...trades].sort(
    (a, b) => tradeTime(a).getTime() - tradeTime(b).getTime()
  );

  let equity = startingEquity;
  let peak = startingEquity;
  let benchmark = startingEquity;
  const points: EquityPoint[] = [
    {
      date: sorted[0]
        ? format(subDays(tradeTime(sorted[0]), 1), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      equity: startingEquity,
      benchmark: startingEquity,
      drawdown: 0,
      drawdownPct: 0,
    },
  ];

  for (const trade of sorted) {
    equity += trade.pnl;
    // Synthetic SPY-ish drift + mild noise from trade day index
    benchmark *= 1 + 0.0008 + (trade.pnl > 0 ? 0.0003 : -0.0002);
    peak = Math.max(peak, equity);
    const drawdown = equity - peak;
    const drawdownPct = peak ? (drawdown / peak) * 100 : 0;
    points.push({
      date: format(tradeTime(trade), "yyyy-MM-dd"),
      equity: Math.round(equity * 100) / 100,
      benchmark: Math.round(benchmark * 100) / 100,
      drawdown: Math.round(drawdown * 100) / 100,
      drawdownPct: Math.round(drawdownPct * 100) / 100,
    });
  }

  return points;
}

export function computeDailyPnl(trades: JournalTrade[]): DailyPnlPoint[] {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const trade of trades) {
    const key = format(tradeTime(trade), "yyyy-MM-dd");
    const cur = map.get(key) ?? { pnl: 0, trades: 0 };
    cur.pnl += trade.pnl;
    cur.trades += 1;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({
      date,
      pnl: Math.round(v.pnl * 100) / 100,
      trades: v.trades,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Aggregates closed-trade P&L by calendar week (Monday start). */
export function computeWeeklyPnl(trades: JournalTrade[]): DailyPnlPoint[] {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const trade of trades) {
    const weekStart = startOfWeek(tradeTime(trade), { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");
    const cur = map.get(key) ?? { pnl: 0, trades: 0 };
    cur.pnl += trade.pnl;
    cur.trades += 1;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({
      date,
      pnl: Math.round(v.pnl * 100) / 100,
      trades: v.trades,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function computeWinLossStats(trades: JournalTrade[]): WinLossStats {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const breakeven = trades.filter((t) => t.pnl === 0 || t.outcome === "Breakeven");
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? -(grossLoss / losses.length) : 0;
  const largestWin = wins.length
    ? Math.max(...wins.map((t) => t.pnl))
    : 0;
  const largestLoss = losses.length
    ? Math.min(...losses.map((t) => t.pnl))
    : 0;
  const winRate = trades.length ? wins.length / trades.length : 0;
  const lossRate = trades.length ? losses.length / trades.length : 0;
  const expectancy = avgWin * winRate + avgLoss * lossRate;

  return {
    grossProfit,
    grossLoss,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    expectancy,
    winCount: wins.length,
    lossCount: losses.length,
    breakevenCount: breakeven.length,
  };
}

export function computePnlBreakdown(trades: JournalTrade[]): PnlBreakdownStats {
  const base = computeWinLossStats(trades);
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0);

  const sorted = [...trades].sort(
    (a, b) => tradeTime(a).getTime() - tradeTime(b).getTime()
  );

  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let streakWins = 0;
  let streakLosses = 0;

  for (const trade of sorted) {
    if (trade.pnl > 0) {
      streakWins += 1;
      streakLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, streakWins);
    } else if (trade.pnl < 0) {
      streakLosses += 1;
      streakWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, streakLosses);
    } else {
      streakWins = 0;
      streakLosses = 0;
    }
  }

  let bestTrade: JournalTrade | null = null;
  let worstTrade: JournalTrade | null = null;
  for (const trade of trades) {
    if (!bestTrade || trade.pnl > bestTrade.pnl) bestTrade = trade;
    if (!worstTrade || trade.pnl < worstTrade.pnl) worstTrade = trade;
  }

  return {
    ...base,
    netPnl,
    bestTradeTicker: bestTrade?.ticker ?? "—",
    worstTradeTicker: worstTrade?.ticker ?? "—",
    maxConsecutiveWins,
    maxConsecutiveLosses,
  };
}

export function computeMonthlyPerformance(
  trades: JournalTrade[],
  startingEquity: number,
  monthCount = 6
): MonthlyPerformancePoint[] {
  const now = new Date();
  const points: MonthlyPerformancePoint[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    points.push(
      buildMonthlyPerformancePoint(trades, startingEquity, monthStart)
    );
  }

  return points;
}

function tradesClosedInPeriod(
  trades: JournalTrade[],
  periodStart: Date,
  periodEnd: Date
): JournalTrade[] {
  return trades.filter((trade) => {
    if (trade.status === "Active") return false;
    const d = tradeTime(trade);
    return !isBefore(d, periodStart) && !isAfter(d, periodEnd);
  });
}

function formatPeriodRiskReward(periodTrades: JournalTrade[]): string {
  const rrValues = periodTrades
    .map((t) => parseRr(t.riskReward))
    .filter((v): v is number => v !== null);
  if (rrValues.length) {
    const avg = rrValues.reduce((sum, v) => sum + v, 0) / rrValues.length;
    return `1:${avg.toFixed(2)}`;
  }
  const wins = periodTrades.filter((t) => t.pnl > 0);
  const losses = periodTrades.filter((t) => t.pnl < 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  if (grossLoss > 0 && grossWin > 0) {
    return `1:${(grossWin / grossLoss).toFixed(2)}`;
  }
  return "—";
}

export function computePeriodTradeStats(
  periodTrades: JournalTrade[]
): PeriodTradeStats {
  const winningTrades = periodTrades.filter((t) => t.outcome === "Win").length;
  const losingTrades = periodTrades.filter((t) => t.outcome === "Loss").length;
  const decided = winningTrades + losingTrades;
  const totalWinAmount = periodTrades
    .filter((t) => t.pnl > 0)
    .reduce((s, t) => s + t.pnl, 0);
  const totalLossAmount = Math.abs(
    periodTrades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0)
  );

  return {
    totalTrades: periodTrades.length,
    winningTrades,
    losingTrades,
    accuracyPct: decided ? (winningTrades / decided) * 100 : 0,
    totalWinAmount: Math.round(totalWinAmount * 100) / 100,
    totalLossAmount: Math.round(totalLossAmount * 100) / 100,
    riskRewardLabel: formatPeriodRiskReward(periodTrades),
  };
}

function buildPeriodPerformancePoint(
  trades: JournalTrade[],
  startingEquity: number,
  periodStart: Date,
  periodEnd: Date,
  meta: { periodKey: string; label: string; periodTitle: string }
): MonthlyPerformancePoint {
  let equityBefore = startingEquity;
  for (const trade of trades) {
    const d = tradeTime(trade);
    if (isBefore(d, periodStart)) equityBefore += trade.pnl;
  }

  let periodPnl = 0;
  for (const trade of trades) {
    const d = tradeTime(trade);
    if (!isBefore(d, periodStart) && !isAfter(d, periodEnd)) {
      periodPnl += trade.pnl;
    }
  }

  const returnPct =
    equityBefore > 0 ? (periodPnl / equityBefore) * 100 : 0;

  const periodTrades = tradesClosedInPeriod(trades, periodStart, periodEnd);

  return {
    monthKey: meta.periodKey,
    label: meta.label,
    monthTitle: meta.periodTitle,
    returnPct: Math.round(returnPct * 100) / 100,
    monthPnl: Math.round(periodPnl * 100) / 100,
    stats: computePeriodTradeStats(periodTrades),
  };
}

function buildMonthlyPerformancePoint(
  trades: JournalTrade[],
  startingEquity: number,
  monthStart: Date
): MonthlyPerformancePoint {
  const monthEnd = endOfMonth(monthStart);
  return buildPeriodPerformancePoint(
    trades,
    startingEquity,
    monthStart,
    monthEnd,
    {
      periodKey: format(monthStart, "yyyy-MM"),
      label: format(monthStart, "MMM ''yy"),
      periodTitle: format(monthStart, "MMMM yyyy"),
    }
  );
}

export function getAnalyticsYears(
  trades: JournalTrade[],
  now = new Date()
): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const trade of trades) {
    if (trade.status === "Active") continue;
    years.add(tradeTime(trade).getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

export function computeMonthlyPerformanceForYear(
  trades: JournalTrade[],
  startingEquity: number,
  year: number,
  now = new Date()
): MonthlyPerformancePoint[] {
  const lastMonthIndex =
    year === now.getFullYear() ? now.getMonth() : 11;
  const points: MonthlyPerformancePoint[] = [];

  for (let m = 0; m <= lastMonthIndex; m++) {
    const monthStart = startOfMonth(new Date(year, m, 1));
    const point = buildMonthlyPerformancePoint(
      trades,
      startingEquity,
      monthStart
    );
    points.push({
      ...point,
      label: format(monthStart, "MMM"),
    });
  }

  return points;
}

function periodHasClosedTrades(
  trades: JournalTrade[],
  periodStart: Date,
  periodEnd: Date
): boolean {
  return tradesClosedInPeriod(trades, periodStart, periodEnd).length > 0;
}

function periodBoundsFromKey(
  key: string,
  granularity: PerformanceGranularity
): { start: Date; end: Date } {
  if (granularity === "monthly") {
    const [yearStr, monthStr] = key.split("-");
    const start = startOfMonth(
      new Date(Number(yearStr), Number(monthStr) - 1, 1)
    );
    return { start, end: endOfMonth(start) };
  }
  const start = startOfDay(parseISO(key));
  if (granularity === "daily") {
    return { start, end: endOfDay(start) };
  }
  return {
    start,
    end: endOfWeek(start, { weekStartsOn: 1 }),
  };
}

function weeklyBoundsInYear(
  key: string,
  year: number,
  now: Date
): { start: Date; end: Date } {
  const weekStart = startOfDay(parseISO(key));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const yearStart = startOfDay(new Date(year, 0, 1));
  const yearEnd = endOfDay(
    year === now.getFullYear() ? now : new Date(year, 11, 31)
  );
  return {
    start: isBefore(weekStart, yearStart) ? yearStart : weekStart,
    end: isAfter(weekEnd, yearEnd) ? yearEnd : weekEnd,
  };
}

function filterPerformancePeriodsWithTrades(
  trades: JournalTrade[],
  points: MonthlyPerformancePoint[],
  granularity: PerformanceGranularity,
  year: number,
  now: Date
): MonthlyPerformancePoint[] {
  return points.filter((point) => {
    const { start, end } =
      granularity === "weekly"
        ? weeklyBoundsInYear(point.monthKey, year, now)
        : periodBoundsFromKey(point.monthKey, granularity);
    return periodHasClosedTrades(trades, start, end);
  });
}

export function computePerformanceForYear(
  trades: JournalTrade[],
  startingEquity: number,
  year: number,
  granularity: PerformanceGranularity,
  now = new Date()
): MonthlyPerformancePoint[] {
  let points: MonthlyPerformancePoint[];

  if (granularity === "monthly") {
    points = computeMonthlyPerformanceForYear(
      trades,
      startingEquity,
      year,
      now
    );
  } else {
    const yearStart = startOfDay(new Date(year, 0, 1));
    const yearEnd = endOfDay(
      year === now.getFullYear() ? now : new Date(year, 11, 31)
    );

    if (granularity === "daily") {
      points = [];
      let cursor = yearStart;
      while (!isAfter(cursor, yearEnd)) {
        const dayStart = startOfDay(cursor);
        const dayEnd = endOfDay(cursor);
        points.push(
          buildPeriodPerformancePoint(
            trades,
            startingEquity,
            dayStart,
            dayEnd,
            {
              periodKey: format(dayStart, "yyyy-MM-dd"),
              label: format(dayStart, "M/d"),
              periodTitle: format(dayStart, "MMM d, yyyy"),
            }
          )
        );
        cursor = addDays(cursor, 1);
      }
    } else {
      points = [];
      let weekStart = startOfWeek(yearStart, { weekStartsOn: 1 });
      while (!isAfter(weekStart, yearEnd)) {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const effectiveStart = isBefore(weekStart, yearStart)
          ? yearStart
          : weekStart;
        const effectiveEnd = isAfter(weekEnd, yearEnd) ? yearEnd : weekEnd;
        if (!isAfter(effectiveStart, effectiveEnd)) {
          points.push(
            buildPeriodPerformancePoint(
              trades,
              startingEquity,
              effectiveStart,
              effectiveEnd,
              {
                periodKey: format(weekStart, "yyyy-MM-dd"),
                label: format(effectiveStart, "MMM d"),
                periodTitle: `Week of ${format(effectiveStart, "MMM d, yyyy")}`,
              }
            )
          );
        }
        weekStart = addDays(weekEnd, 1);
      }
    }
  }

  return filterPerformancePeriodsWithTrades(
    trades,
    points,
    granularity,
    year,
    now
  );
}

export function tradeRMultiple(trade: JournalTrade): number | null {
  if (trade.plannedRisk > 0) {
    return Math.round((trade.pnl / trade.plannedRisk) * 100) / 100;
  }
  return null;
}

export function computeStrategyMetrics(trades: JournalTrade[]): StrategyMetric[] {
  const map = new Map<string, JournalTrade[]>();
  for (const t of trades) {
    const list = map.get(t.strategy) ?? [];
    list.push(t);
    map.set(t.strategy, list);
  }

  return Array.from(map.entries())
    .map(([strategy, list]) => {
      const wins = list.filter((t) => t.outcome === "Win");
      const losses = list.filter((t) => t.outcome === "Loss");
      const totalPnl = list.reduce((s, t) => s + t.pnl, 0);
      const gp = wins.reduce((s, t) => s + t.pnl, 0);
      const gl = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
      const series = computeEquitySeries(list, 10000);
      const maxDrawdown = series.reduce(
        (min, p) => Math.min(min, p.drawdown),
        0
      );
      return {
        strategy,
        trades: list.length,
        wins: wins.length,
        winRate: list.length ? (wins.length / list.length) * 100 : 0,
        totalPnl,
        profitFactor: gl === 0 ? (gp > 0 ? Infinity : 0) : gp / gl,
        avgDurationHours:
          list.reduce((s, t) => s + t.holdTimeHours, 0) / (list.length || 1),
        maxDrawdown,
      };
    })
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const SESSIONS = ["Open", "Midday", "Power Hour"] as const;

function sessionBucket(date: Date): (typeof SESSIONS)[number] {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < 11.5) return "Open";
  if (h < 14.5) return "Midday";
  return "Power Hour";
}

export function computeHeatmap(trades: JournalTrade[]): HeatCell[] {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const day of DAYS) {
    for (const session of SESSIONS) {
      map.set(`${day}|${session}`, { pnl: 0, trades: 0 });
    }
  }

  for (const trade of trades) {
    const d = tradeTime(trade);
    const dayIdx = d.getDay(); // 0 Sun
    if (dayIdx === 0 || dayIdx === 6) continue;
    const day = DAYS[dayIdx - 1];
    const session = sessionBucket(d);
    const key = `${day}|${session}`;
    const cur = map.get(key)!;
    cur.pnl += trade.pnl;
    cur.trades += 1;
  }

  return Array.from(map.entries()).map(([key, v]) => {
    const [day, session] = key.split("|");
    return {
      day,
      session,
      pnl: Math.round(v.pnl * 100) / 100,
      trades: v.trades,
    };
  });
}

export interface CalendarDay {
  date: string;
  pnl: number | null;
  trades: number;
}

export interface PnlCalendarData {
  weeks: CalendarDay[][];
  maxAbsPnl: number;
}

/** Daily P&L cells grouped into week columns (Sun–Sat) for a calendar heatmap. */
export function computePnlCalendar(
  trades: JournalTrade[],
  weekCount = 26,
  now = new Date()
): PnlCalendarData {
  const dailyMap = new Map(
    computeDailyPnl(trades).map((d) => [d.date, d])
  );
  const calendarEnd = endOfDay(now);
  const calendarStart = startOfWeek(subDays(calendarEnd, weekCount * 7 - 1), {
    weekStartsOn: 0,
  });

  const days: CalendarDay[] = [];
  let cursor = calendarStart;
  while (!isAfter(cursor, calendarEnd)) {
    const key = format(cursor, "yyyy-MM-dd");
    const entry = dailyMap.get(key);
    days.push({
      date: key,
      pnl: entry?.pnl ?? null,
      trades: entry?.trades ?? 0,
    });
    cursor = addDays(cursor, 1);
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const maxAbsPnl = Math.max(
    1,
    ...days.map((d) => (d.pnl !== null ? Math.abs(d.pnl) : 0))
  );

  return { weeks, maxAbsPnl };
}

export interface RMultipleBucket {
  label: string;
  count: number;
}

export function computeRMultipleBuckets(
  trades: JournalTrade[]
): RMultipleBucket[] {
  const defs = [
    { label: "< -2R", test: (r: number) => r < -2 },
    { label: "-2R to -1R", test: (r: number) => r >= -2 && r < -1 },
    { label: "-1R to 0", test: (r: number) => r >= -1 && r < 0 },
    { label: "0 to 1R", test: (r: number) => r >= 0 && r < 1 },
    { label: "1R to 2R", test: (r: number) => r >= 1 && r < 2 },
    { label: "2R to 3R", test: (r: number) => r >= 2 && r < 3 },
    { label: "3R+", test: (r: number) => r >= 3 },
  ] as const;

  const rValues = trades
    .map(tradeRMultiple)
    .filter((r): r is number => r !== null);

  return defs.map(({ label, test }) => ({
    label,
    count: rValues.filter(test).length,
  }));
}

export interface TagMetric {
  tag: string;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgR: number | null;
}

export function computeTagMetrics(trades: JournalTrade[]): TagMetric[] {
  const map = new Map<string, JournalTrade[]>();
  for (const t of trades) {
    const tags = t.tags.length > 0 ? t.tags : ["Untagged"];
    for (const tag of tags) {
      const list = map.get(tag) ?? [];
      list.push(t);
      map.set(tag, list);
    }
  }

  return Array.from(map.entries())
    .map(([tag, list]) => {
      const wins = list.filter((t) => t.pnl > 0);
      const rValues = list
        .map(tradeRMultiple)
        .filter((r): r is number => r !== null);
      return {
        tag,
        trades: list.length,
        winRate: list.length ? (wins.length / list.length) * 100 : 0,
        totalPnl: Math.round(list.reduce((s, t) => s + t.pnl, 0) * 100) / 100,
        avgR: rValues.length
          ? Math.round(
              (rValues.reduce((a, b) => a + b, 0) / rValues.length) * 100
            ) / 100
          : null,
      };
    })
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

export function computeDurationBuckets(trades: JournalTrade[]): DurationBucket[] {
  const buckets = [
    { bucket: "Scalp (<4h)", test: (h: number) => h < 4 },
    { bucket: "Intraday (4–24h)", test: (h: number) => h >= 4 && h < 24 },
    { bucket: "Swing (1–5d)", test: (h: number) => h >= 24 && h < 120 },
    { bucket: "Position (5d+)", test: (h: number) => h >= 120 },
  ];

  return buckets.map(({ bucket, test }) => {
    const list = trades.filter((t) => test(t.holdTimeHours));
    const totalPnl = list.reduce((s, t) => s + t.pnl, 0);
    const avgReturn = list.length
      ? list.reduce((s, t) => s + t.roi, 0) / list.length
      : 0;
    return {
      bucket,
      avgReturn: Math.round(avgReturn * 100) / 100,
      trades: list.length,
      totalPnl: Math.round(totalPnl * 100) / 100,
    };
  });
}

export interface TradingInsights {
  winRateCushion: number | null;
  breakEvenWinRate: number | null;
  actualWinRate: number;
  greenDayRate: number;
  greenDays: number;
  tradingDays: number;
  recoveryFactor: number | null;
  bestWeekday: { day: string; pnl: number } | null;
  profitConcentrationPct: number | null;
  topProfitTicker: string | null;
  plannedRiskRate: number;
  rTargetHitRate: number | null;
  sweetSpotHold: string | null;
  lossAfterWinRate: number | null;
}

const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export function computeTradingInsights(
  trades: JournalTrade[],
  startingEquity = 10000
): TradingInsights {
  const breakdown = computePnlBreakdown(trades);
  const kpis = computeKpis(trades, startingEquity);
  const heatmap = computeHeatmap(trades);
  const durationBuckets = computeDurationBuckets(trades);

  const avgLossAbs = Math.abs(breakdown.avgLoss);
  const payoffRatio =
    avgLossAbs > 0 ? breakdown.avgWin / avgLossAbs : null;
  const breakEvenWinRate =
    payoffRatio != null && payoffRatio > 0
      ? Math.round((1 / (1 + payoffRatio)) * 1000) / 10
      : null;
  const winRateCushion =
    breakEvenWinRate != null
      ? Math.round((kpis.winRate - breakEvenWinRate) * 10) / 10
      : null;

  const daily = computeDailyPnl(trades);
  const tradingDays = daily.length;
  const greenDays = daily.filter((d) => d.pnl > 0).length;
  const greenDayRate = tradingDays
    ? Math.round((greenDays / tradingDays) * 1000) / 10
    : 0;

  const recoveryFactor =
    kpis.maxDrawdown !== 0
      ? Math.round((breakdown.netPnl / Math.abs(kpis.maxDrawdown)) * 100) / 100
      : null;

  const weekdayPnl = new Map<string, number>();
  for (const day of WEEKDAY_ORDER) weekdayPnl.set(day, 0);
  for (const cell of heatmap) {
    weekdayPnl.set(cell.day, (weekdayPnl.get(cell.day) ?? 0) + cell.pnl);
  }
  const weekdayRanked = WEEKDAY_ORDER.map((day) => ({
    day,
    pnl: Math.round((weekdayPnl.get(day) ?? 0) * 100) / 100,
  })).sort((a, b) => b.pnl - a.pnl);
  const bestWeekday =
    weekdayRanked[0] && weekdayRanked[0].pnl !== 0 ? weekdayRanked[0] : null;

  const grossProfit = trades
    .filter((t) => t.pnl > 0)
    .reduce((s, t) => s + t.pnl, 0);
  const tickerProfit = new Map<string, number>();
  for (const trade of trades) {
    if (trade.pnl <= 0) continue;
    tickerProfit.set(
      trade.ticker,
      (tickerProfit.get(trade.ticker) ?? 0) + trade.pnl
    );
  }
  const topProfitEntry = [...tickerProfit.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0];
  const profitConcentrationPct =
    grossProfit > 0 && topProfitEntry
      ? Math.round((topProfitEntry[1] / grossProfit) * 1000) / 10
      : null;

  const withPlannedRisk = trades.filter((t) => t.plannedRisk > 0);
  const plannedRiskRate = trades.length
    ? Math.round((withPlannedRisk.length / trades.length) * 1000) / 10
    : 0;
  const rWinners = withPlannedRisk.filter(
    (t) => (tradeRMultiple(t) ?? 0) >= 1
  );
  const rTargetHitRate = withPlannedRisk.length
    ? Math.round((rWinners.length / withPlannedRisk.length) * 1000) / 10
    : null;

  const sweetSpotHold =
    [...durationBuckets]
      .filter((b) => b.trades > 0)
      .sort((a, b) => b.totalPnl - a.totalPnl)[0]?.bucket ?? null;

  const sorted = [...trades].sort(
    (a, b) => tradeTime(a).getTime() - tradeTime(b).getTime()
  );
  let lossAfterWin = 0;
  let lossCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].pnl < 0) {
      lossCount += 1;
      if (sorted[i - 1].pnl > 0) lossAfterWin += 1;
    }
  }
  const lossAfterWinRate = lossCount
    ? Math.round((lossAfterWin / lossCount) * 1000) / 10
    : null;

  return {
    winRateCushion,
    breakEvenWinRate,
    actualWinRate: Math.round(kpis.winRate * 10) / 10,
    greenDayRate,
    greenDays,
    tradingDays,
    recoveryFactor,
    bestWeekday,
    profitConcentrationPct,
    topProfitTicker: topProfitEntry?.[0] ?? null,
    plannedRiskRate,
    rTargetHitRate,
    sweetSpotHold,
    lossAfterWinRate,
  };
}

export function formatMoney(
  value: number,
  withSign = true,
  currency: CurrencyCode = DEFAULT_CURRENCY
) {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  if (!withSign) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return formatSignedMoney(value, currency);
}

export function formatPf(value: number) {
  if (!Number.isFinite(value)) return "∞";
  return trimTrailingZeros(value.toFixed(2));
}

/** Drops trailing zeros after the decimal (e.g. 100.0 → 100, 5.0 → 5). */
export function trimTrailingZeros(formatted: string): string {
  if (!formatted.includes(".")) return formatted;
  return formatted.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function formatPercent(value: number, decimals = 1): string {
  return `${trimTrailingZeros(value.toFixed(decimals))}%`;
}

export function formatSignedPercent(value: number, decimals = 1): string {
  if (value > 0) return `+${trimTrailingZeros(value.toFixed(decimals))}%`;
  if (value < 0) return `-${trimTrailingZeros(Math.abs(value).toFixed(decimals))}%`;
  return `${trimTrailingZeros(value.toFixed(decimals))}%`;
}
