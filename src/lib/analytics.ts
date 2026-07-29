import {
  endOfDay,
  endOfMonth,
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
import type { JournalTrade } from "@/lib/journal-types";

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
}


function tradeTime(trade: JournalTrade) {
  return parseISO(trade.exitDate || trade.entryDate);
}

function getRange(
  filters: AnalyticsFilters,
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
  const { from, to } = getRange(filters);

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

function buildMonthlyPerformancePoint(
  trades: JournalTrade[],
  startingEquity: number,
  monthStart: Date
): MonthlyPerformancePoint {
  const monthEnd = endOfMonth(monthStart);

  let equityBefore = startingEquity;
  for (const trade of trades) {
    const d = tradeTime(trade);
    if (isBefore(d, monthStart)) equityBefore += trade.pnl;
  }

  let monthPnl = 0;
  for (const trade of trades) {
    const d = tradeTime(trade);
    if (!isBefore(d, monthStart) && !isAfter(d, monthEnd)) {
      monthPnl += trade.pnl;
    }
  }

  const returnPct =
    equityBefore > 0 ? (monthPnl / equityBefore) * 100 : 0;

  return {
    monthKey: format(monthStart, "yyyy-MM"),
    label: format(monthStart, "MMM ''yy"),
    monthTitle: format(monthStart, "MMMM yyyy"),
    returnPct: Math.round(returnPct * 100) / 100,
    monthPnl: Math.round(monthPnl * 100) / 100,
  };
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

export function formatMoney(value: number, withSign = true) {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!withSign) return `$${abs}`;
  if (value > 0) return `+$${abs}`;
  if (value < 0) return `-$${abs}`;
  return `$${abs}`;
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
