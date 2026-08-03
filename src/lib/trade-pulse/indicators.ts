import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { OhlcvBar, PositionMarketData } from "@/lib/trade-pulse/types";
import type { ListingMarketId } from "@/lib/equity-listing-markets";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function trueRange(current: OhlcvBar, previousClose: number): number {
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previousClose),
    Math.abs(current.low - previousClose)
  );
}

export function computeAtr14(bars: OhlcvBar[]): number | null {
  if (bars.length < 15) return null;

  const ranges: number[] = [];
  for (let index = 1; index < bars.length; index += 1) {
    ranges.push(trueRange(bars[index], bars[index - 1].close));
  }

  const last14 = ranges.slice(-14);
  if (last14.length < 14) return null;
  return average(last14);
}

export function computeAverageVolume(bars: OhlcvBar[], lookback = 20): number | null {
  if (bars.length < lookback) return null;
  const volumes = bars.slice(-lookback).map((bar) => bar.volume);
  return average(volumes);
}

export function buildPositionMarketData(input: {
  ticker: string;
  listingMarket: ListingMarketId;
  entryDate: string;
  bars: OhlcvBar[];
  provider: string;
  asOf?: Date;
}): PositionMarketData | null {
  const sorted = [...input.bars]
    .filter(
      (bar) =>
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.low) &&
        Number.isFinite(bar.close) &&
        Number.isFinite(bar.volume)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 22) return null;

  const today = sorted[sorted.length - 1];
  const history = sorted.slice(0, -1);
  const previousClose = history[history.length - 1]?.close;
  if (previousClose == null || previousClose <= 0) return null;

  const avgVolume20d = computeAverageVolume(history, 20);
  const atr14 = computeAtr14(history);
  if (avgVolume20d == null || avgVolume20d <= 0 || atr14 == null || atr14 <= 0) {
    return null;
  }

  const priceMoveAbs = Math.abs(today.close - previousClose);
  const priceMovePct = ((today.close - previousClose) / previousClose) * 100;
  const volumeRatio = today.volume / avgVolume20d;
  const priceMoveAtrMultiple = priceMoveAbs / atr14;

  const entry = startOfDay(parseISO(input.entryDate));
  const asOf = input.asOf ?? new Date();

  return {
    ticker: input.ticker,
    listingMarket: input.listingMarket,
    entryDate: input.entryDate,
    daysSinceEntry: Math.max(differenceInCalendarDays(asOf, entry), 0),
    asOf: asOf.toISOString(),
    today,
    previousClose,
    avgVolume20d,
    volumeRatio,
    atr14,
    priceMovePct,
    priceMoveAbs,
    priceMoveAtrMultiple,
    provider: input.provider,
  };
}
