import { differenceInDays, parseISO, startOfDay } from "date-fns";
import type { JournalTrade } from "@/lib/journal-types";
import { isClosedTrade } from "@/lib/journal-types";
import {
  getPortfolioTimeframeRange,
  portfolioMetricValue,
  type PortfolioChartTimeframe,
  type PortfolioMetric,
  type PortfolioTimelinePoint,
} from "@/lib/portfolio-timeline";

const MS_PER_DAY = 86_400_000;
const MIN_MEANINGFUL_VALUE = 0.01;
const MAX_DISPLAY_RETURN_PCT = 9_999;

export type CashFlow = { date: Date; amount: number };

function roundReturnPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Keep displayed return percentages finite and human-readable. */
export function sanitizeReturnPercent(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) > MAX_DISPLAY_RETURN_PCT) return null;
  return roundReturnPercent(value);
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function buildPortfolioPeriodCashFlows(
  trades: JournalTrade[],
  series: PortfolioTimelinePoint[],
  timeframe: PortfolioChartTimeframe,
  now = new Date()
): CashFlow[] {
  if (series.length === 0) return [];

  const { from, to } = getPortfolioTimeframeRange(timeframe, now);
  const startPoint = series[0];
  const endPoint = series[series.length - 1];
  const startDate = from ?? parseISO(startPoint.date);
  const endDate = to ?? now;
  const startMs = startOfDay(startDate).getTime();
  const endMs = endOfDay(endDate).getTime();

  const flows: CashFlow[] = [];

  if (startPoint.portfolioValue > MIN_MEANINGFUL_VALUE) {
    flows.push({
      date: startOfDay(startDate),
      amount: -startPoint.portfolioValue,
    });
  }

  for (const trade of trades) {
    const notional = Math.abs(trade.entryPrice * trade.quantity);
    if (!Number.isFinite(notional) || notional <= 0) continue;

    const entryMs = parseISO(trade.entryDate).getTime();
    if (entryMs >= startMs && entryMs <= endMs) {
      flows.push({
        date: parseISO(trade.entryDate),
        amount: -notional,
      });
    }

    if (isClosedTrade(trade) && trade.exitDate) {
      const exitMs = parseISO(trade.exitDate).getTime();
      if (exitMs >= startMs && exitMs <= endMs) {
        flows.push({
          date: parseISO(trade.exitDate),
          amount: notional + trade.pnl,
        });
      }
    }
  }

  flows.push({
    date: startOfDay(endDate),
    amount: endPoint.portfolioValue,
  });

  return flows.filter((flow) => Math.abs(flow.amount) > MIN_MEANINGFUL_VALUE);
}

function npv(rate: number, cashFlows: CashFlow[], t0: number) {
  return cashFlows.reduce((sum, cf) => {
    const years = (cf.date.getTime() - t0) / MS_PER_DAY / 365;
    return sum + cf.amount / Math.pow(1 + rate, years);
  }, 0);
}

function npvDerivative(rate: number, cashFlows: CashFlow[], t0: number) {
  return cashFlows.reduce((sum, cf) => {
    const years = (cf.date.getTime() - t0) / MS_PER_DAY / 365;
    if (years === 0) return sum;
    return sum - (years * cf.amount) / Math.pow(1 + rate, years + 1);
  }, 0);
}

/** Annualized XIRR as a percentage (e.g. 23.3 for +23.3%). */
export function computeXirrPercent(
  cashFlows: CashFlow[],
  guess = 0.1
): number | null {
  if (cashFlows.length < 2) return null;

  const sorted = [...cashFlows].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const hasPositive = sorted.some((cf) => cf.amount > 0);
  const hasNegative = sorted.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const t0 = sorted[0].date.getTime();

  let rate = guess;
  for (let i = 0; i < 64; i++) {
    const value = npv(rate, sorted, t0);
    const deriv = npvDerivative(rate, sorted, t0);
    if (Math.abs(value) < 1e-7) {
      return sanitizeReturnPercent(rate * 100);
    }
    if (Math.abs(deriv) < 1e-10) break;
    const next = rate - value / deriv;
    if (!Number.isFinite(next) || next <= -0.999 || next > 5) break;
    if (Math.abs(next - rate) < 1e-7) {
      return sanitizeReturnPercent(next * 100);
    }
    rate = next;
  }

  let low = -0.999;
  let high = 5;
  let lowNpv = npv(low, sorted, t0);
  let highNpv = npv(high, sorted, t0);
  if (lowNpv * highNpv > 0) return null;

  for (let i = 0; i < 128; i++) {
    const mid = (low + high) / 2;
    const midNpv = npv(mid, sorted, t0);
    if (Math.abs(midNpv) < 1e-7) {
      return sanitizeReturnPercent(mid * 100);
    }
    if (midNpv * lowNpv < 0) {
      high = mid;
      highNpv = midNpv;
    } else {
      low = mid;
      lowNpv = midNpv;
    }
  }

  return sanitizeReturnPercent(((low + high) / 2) * 100);
}

export function computePortfolioXirrPercent(
  trades: JournalTrade[],
  series: PortfolioTimelinePoint[],
  timeframe: PortfolioChartTimeframe,
  now = new Date()
): number | null {
  const flows = buildPortfolioPeriodCashFlows(trades, series, timeframe, now);
  return sanitizeReturnPercent(computeXirrPercent(flows));
}

/** Annualized period return fallback when XIRR cannot be solved. */
export function computePortfolioPeriodReturnPercent(
  series: PortfolioTimelinePoint[],
  metric: PortfolioMetric = "portfolio"
): number | null {
  if (series.length < 2) return null;

  const start = portfolioMetricValue(series[0], metric);
  const end = portfolioMetricValue(series[series.length - 1], metric);
  const days = Math.max(
    differenceInDays(
      parseISO(series[series.length - 1].date),
      parseISO(series[0].date)
    ),
    1
  );

  if (Math.abs(start) < MIN_MEANINGFUL_VALUE) {
    return null;
  }

  const totalReturn = end / start;
  if (!Number.isFinite(totalReturn) || totalReturn <= 0) {
    return sanitizeReturnPercent(-100);
  }

  const annualized = (Math.pow(totalReturn, 365 / days) - 1) * 100;
  return sanitizeReturnPercent(annualized);
}

export function portfolioVsBenchmarkDelta(
  portfolioXirr: number | null,
  benchmarkXirr: number | null
): number | null {
  if (portfolioXirr == null || benchmarkXirr == null) return null;
  return roundReturnPercent(portfolioXirr - benchmarkXirr);
}
