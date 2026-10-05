import { emaSeries } from "@/lib/screener/ema";
import type { ScreenerChartPoint } from "@/lib/screener/types";

/** Daily momentum base: trend, breakout candle, then a quiet hold. */
export const MOMENTUM_RULES = {
  resistanceLookback: 20,
  minBreakoutVolumeMultiple: 1.5,
  maxUpperWickRatio: 0.1,
  /** Breakout must be recent, but not the latest bar. */
  maxBreakoutAge: 12,
  minConsolidationBars: 2,
  /** Base high-to-low as a fraction of the breakout close. */
  maxConsolidationRange: 0.08,
  minMarketCapCrore: 10_000,
} as const;

export type MomentumSetup = {
  breakoutDate: string;
  resistance: number;
  volumeMultiple: number;
  upperWickRatio: number;
  consolidationBars: number;
  baseHigh: number;
  baseLow: number;
};

type OhlcvBar = ScreenerChartPoint & {
  open: number;
  high: number;
  low: number;
  volume: number;
};

function isOhlcv(point: ScreenerChartPoint): point is OhlcvBar {
  return (
    point.open != null &&
    point.open > 0 &&
    point.high != null &&
    point.high > 0 &&
    point.low != null &&
    point.low > 0 &&
    point.volume != null &&
    point.volume > 0 &&
    point.close > 0
  );
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function lastValue(series: Array<number | null>): number | null {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = series[index];
    if (value != null && value > 0) return value;
  }
  return null;
}

export function chartHasOhlcv(chart: ScreenerChartPoint[]): boolean {
  const recent = chart.slice(-40);
  return recent.filter(isOhlcv).length >= 20;
}

function weekStart(date: string): string | null {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = parsed.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(parsed);
  monday.setUTCDate(parsed.getUTCDate() + mondayOffset);
  return monday.toISOString().slice(0, 10);
}

/** Monday-open weekly candles built from daily OHLCV. */
export function toWeeklyOhlcv(chart: ScreenerChartPoint[]): ScreenerChartPoint[] {
  const weeks = new Map<string, OhlcvBar>();
  for (const point of chart) {
    if (!isOhlcv(point)) continue;
    const key = weekStart(point.date);
    if (!key) continue;
    const existing = weeks.get(key);
    if (!existing) {
      weeks.set(key, {
        date: key,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      });
      continue;
    }
    existing.high = Math.max(existing.high, point.high);
    existing.low = Math.min(existing.low, point.low);
    existing.close = point.close;
    existing.volume += point.volume;
  }
  return [...weeks.values()].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
}

/**
 * Latest setup on this bar series: price above the 50 and 200 EMA, a recent
 * green candle closed through the prior 20-bar high on heavy volume with an
 * upper wick of 10% or less, then a tight base on lighter volume.
 */
export function detectMomentumSetup(
  chart: ScreenerChartPoint[]
): MomentumSetup | null {
  const bars = chart.filter(isOhlcv);
  const minBars =
    200 +
    MOMENTUM_RULES.resistanceLookback +
    MOMENTUM_RULES.minConsolidationBars;
  if (bars.length < minBars) return null;

  const closes = bars.map((bar) => bar.close);
  const price = closes[closes.length - 1] ?? 0;
  const ema50 = lastValue(emaSeries(closes, 50));
  const ema200 = lastValue(emaSeries(closes, 200));
  if (ema50 == null || ema200 == null || price <= ema50 || price <= ema200) {
    return null;
  }

  const lastIndex = bars.length - 1;
  const newestBreakoutAge = MOMENTUM_RULES.minConsolidationBars;
  const oldestBreakoutAge = MOMENTUM_RULES.maxBreakoutAge;

  for (let age = newestBreakoutAge; age <= oldestBreakoutAge; age += 1) {
    const index = lastIndex - age;
    const lookbackStart = index - MOMENTUM_RULES.resistanceLookback;
    if (lookbackStart < 0) break;

    const bar = bars[index];
    if (!bar || bar.close <= bar.open) continue;

    const range = bar.high - bar.low;
    if (range <= 0) continue;
    const upperWickRatio = (bar.high - bar.close) / range;
    if (upperWickRatio > MOMENTUM_RULES.maxUpperWickRatio) continue;

    const prior = bars.slice(lookbackStart, index);
    const resistance = Math.max(...prior.map((point) => point.high));
    if (!Number.isFinite(resistance) || resistance <= 0 || bar.close <= resistance) {
      continue;
    }

    const averageVolume = average(prior.map((point) => point.volume));
    if (
      averageVolume == null ||
      averageVolume <= 0 ||
      bar.volume < averageVolume * MOMENTUM_RULES.minBreakoutVolumeMultiple
    ) {
      continue;
    }

    const base = bars.slice(index + 1);
    if (base.length < MOMENTUM_RULES.minConsolidationBars) continue;
    if (base.some((point) => point.close <= resistance)) continue;

    const baseHigh = Math.max(...base.map((point) => point.high));
    const baseLow = Math.min(...base.map((point) => point.low));
    if ((baseHigh - baseLow) / bar.close > MOMENTUM_RULES.maxConsolidationRange) {
      continue;
    }

    const baseVolume = average(base.map((point) => point.volume));
    if (baseVolume == null || baseVolume >= bar.volume) continue;

    return {
      breakoutDate: bar.date,
      resistance: Math.round(resistance * 100) / 100,
      volumeMultiple: Math.round((bar.volume / averageVolume) * 10) / 10,
      upperWickRatio: Math.round(upperWickRatio * 1000) / 1000,
      consolidationBars: base.length,
      baseHigh: Math.round(baseHigh * 100) / 100,
      baseLow: Math.round(baseLow * 100) / 100,
    };
  }

  return null;
}
