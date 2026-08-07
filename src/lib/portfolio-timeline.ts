import {
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  subDays,
  subMonths,
} from "date-fns";
import type { JournalTrade } from "@/lib/journal-types";
import { isClosedTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import {
  resolveTradePnlDisplay,
  type QuoteForPnl,
} from "@/lib/trade-pnl";

export type PortfolioChartTimeframe =
  | "1d"
  | "3d"
  | "7d"
  | "15d"
  | "1m"
  | "6m"
  | "1y"
  | "3y"
  | "5y"
  | "all";

export const PORTFOLIO_CHART_TIMEFRAMES: {
  value: PortfolioChartTimeframe;
  label: string;
}[] = [
  { value: "1d", label: "1D" },
  { value: "3d", label: "3D" },
  { value: "7d", label: "7D" },
  { value: "15d", label: "15D" },
  { value: "1m", label: "1M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "all", label: "All" },
];

export type PortfolioTimelinePoint = {
  date: string;
  invested: number;
  totalPnl: number;
  portfolioValue: number;
};

const EMPTY_POINT: Omit<PortfolioTimelinePoint, "date"> = {
  invested: 0,
  totalPnl: 0,
  portfolioValue: 0,
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function parseTradeDate(value: string) {
  return parseISO(value);
}

function endOfDaySafe(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function getPortfolioTimeframeRange(
  timeframe: PortfolioChartTimeframe,
  now = new Date()
): { from?: Date; to?: Date } {
  if (timeframe === "all") return { to: now };
  if (timeframe === "1d") return { from: subDays(now, 1), to: now };
  if (timeframe === "3d") return { from: subDays(now, 3), to: now };
  if (timeframe === "7d") return { from: subDays(now, 7), to: now };
  if (timeframe === "15d") return { from: subDays(now, 15), to: now };
  if (timeframe === "1m") return { from: subMonths(now, 1), to: now };
  if (timeframe === "6m") return { from: subMonths(now, 6), to: now };
  if (timeframe === "1y") return { from: subMonths(now, 12), to: now };
  if (timeframe === "3y") return { from: subMonths(now, 36), to: now };
  return { from: subMonths(now, 60), to: now };
}

export function computePortfolioTimeline(
  trades: JournalTrade[]
): PortfolioTimelinePoint[] {
  type Event = { ts: number; investedDelta: number; pnlDelta: number };
  const events: Event[] = [];

  for (const trade of trades) {
    const notional = Math.abs(trade.entryPrice * trade.quantity);
    if (!Number.isFinite(notional) || notional <= 0) continue;

    events.push({
      ts: parseTradeDate(trade.entryDate).getTime(),
      investedDelta: notional,
      pnlDelta: 0,
    });

    if (isClosedTrade(trade) && trade.exitDate) {
      events.push({
        ts: parseTradeDate(trade.exitDate).getTime(),
        investedDelta: -notional,
        pnlDelta: trade.pnl,
      });
    }
  }

  if (events.length === 0) return [];

  events.sort((a, b) => a.ts - b.ts);

  const byDay = new Map<string, { investedDelta: number; pnlDelta: number }>();
  for (const event of events) {
    const key = format(new Date(event.ts), "yyyy-MM-dd");
    const cur = byDay.get(key) ?? { investedDelta: 0, pnlDelta: 0 };
    cur.investedDelta += event.investedDelta;
    cur.pnlDelta += event.pnlDelta;
    byDay.set(key, cur);
  }

  let invested = 0;
  let totalPnl = 0;
  const points: PortfolioTimelinePoint[] = [];

  for (const [date, delta] of Array.from(byDay.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    invested += delta.investedDelta;
    totalPnl += delta.pnlDelta;
    points.push({
      date,
      invested: roundMoney(Math.max(0, invested)),
      totalPnl: roundMoney(totalPnl),
      portfolioValue: roundMoney(Math.max(0, invested) + totalPnl),
    });
  }

  return points;
}

/** Current portfolio snapshot with live unrealized P&L on open positions. */
export function computeLivePortfolioSnapshot(
  trades: JournalTrade[],
  getQuote: (trade: JournalTrade) => QuoteForPnl | null,
  currency: CurrencyCode,
  now = new Date()
): PortfolioTimelinePoint {
  let invested = 0;
  let totalPnl = 0;

  for (const trade of trades) {
    const notional = Math.abs(trade.entryPrice * trade.quantity);
    if (!Number.isFinite(notional) || notional <= 0) continue;

    const isActive = (trade.status ?? "Closed") === "Active";
    if (isActive) {
      invested += notional;
      const display = resolveTradePnlDisplay(trade, getQuote(trade), currency);
      totalPnl += display.pnl;
    } else {
      totalPnl += trade.pnl;
    }
  }

  return {
    date: format(startOfDay(now), "yyyy-MM-dd"),
    invested: roundMoney(Math.max(0, invested)),
    totalPnl: roundMoney(totalPnl),
    portfolioValue: roundMoney(Math.max(0, invested) + totalPnl),
  };
}

function baselineBefore(
  points: PortfolioTimelinePoint[],
  before: Date
): PortfolioTimelinePoint {
  let last: PortfolioTimelinePoint = {
    date: format(startOfDay(before), "yyyy-MM-dd"),
    ...EMPTY_POINT,
  };

  for (const point of points) {
    if (isBefore(parseISO(point.date), startOfDay(before))) {
      last = point;
    } else {
      break;
    }
  }

  return last;
}

function upsertPoint(
  series: PortfolioTimelinePoint[],
  point: PortfolioTimelinePoint
) {
  const last = series[series.length - 1];
  if (last?.date === point.date) {
    series[series.length - 1] = point;
    return;
  }
  series.push(point);
}

/** Chart series for a timeframe — anchors period start/end so the line reshapes per range. */
export function buildPortfolioChartSeries(
  points: PortfolioTimelinePoint[],
  timeframe: PortfolioChartTimeframe,
  now = new Date(),
  liveEnd?: PortfolioTimelinePoint
): PortfolioTimelinePoint[] {
  if (points.length === 0) return [];

  const { from, to } = getPortfolioTimeframeRange(timeframe, now);
  const latest = liveEnd ?? points[points.length - 1];
  const endKey = format(startOfDay(to ?? now), "yyyy-MM-dd");

  const inRange = points.filter((point) => {
    const date = parseISO(point.date);
    if (from && isBefore(date, startOfDay(from))) return false;
    if (to && isAfter(date, endOfDaySafe(to))) return false;
    return true;
  });

  const series: PortfolioTimelinePoint[] = [];

  if (from) {
    const baseline = baselineBefore(points, from);
    upsertPoint(series, {
      date: format(startOfDay(from), "yyyy-MM-dd"),
      invested: baseline.invested,
      totalPnl: baseline.totalPnl,
      portfolioValue: baseline.portfolioValue,
    });
  } else if (points[0]) {
    upsertPoint(series, { ...points[0] });
  }

  for (const point of inRange) {
    upsertPoint(series, point);
  }

  upsertPoint(series, {
    date: endKey,
    invested: latest.invested,
    totalPnl: latest.totalPnl,
    portfolioValue: latest.portfolioValue,
  });

  return series;
}

export type PortfolioMetric = "invested" | "pnl" | "portfolio";

export function portfolioMetricValue(
  point: PortfolioTimelinePoint,
  metric: PortfolioMetric
) {
  if (metric === "invested") return point.invested;
  if (metric === "pnl") return point.totalPnl;
  return point.portfolioValue;
}

export function portfolioPeriodChange(
  series: PortfolioTimelinePoint[],
  metric: PortfolioMetric
) {
  if (series.length === 0) {
    return { current: 0, start: 0, delta: 0, deltaPct: 0 };
  }
  const current = portfolioMetricValue(series[series.length - 1], metric);
  const start = portfolioMetricValue(series[0], metric);
  const delta = roundMoney(current - start);
  const deltaPct =
    start !== 0
      ? roundMoney((delta / Math.abs(start)) * 100)
      : current !== 0
        ? 100
        : 0;
  return { current, start, delta, deltaPct };
}
