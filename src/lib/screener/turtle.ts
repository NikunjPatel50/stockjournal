import type { ScreenerChartPoint } from "@/lib/screener/types";

export type TurtleBreakout = {
  broken: boolean;
  fresh: boolean;
  ageBars: number | null;
  channelHigh: number | null;
  extension: number | null;
};

function barHigh(point: ScreenerChartPoint): number {
  return point.high != null && point.high > 0 ? point.high : point.close;
}

function maxPriorHigh(points: ScreenerChartPoint[], endIndex: number, lookback: number) {
  const start = endIndex - lookback;
  if (start < 0 || endIndex <= 0) return null;
  let high = -Infinity;
  for (let index = start; index < endIndex; index += 1) {
    const value = barHigh(points[index]!);
    if (value > high) high = value;
  }
  return Number.isFinite(high) && high > 0 ? high : null;
}

export function toWeeklyTurtleBars(chart: ScreenerChartPoint[]): ScreenerChartPoint[] {
  const weeks = new Map<string, ScreenerChartPoint>();
  for (const point of chart) {
    if (!Number.isFinite(point.close) || point.close <= 0) continue;
    const date = new Date(`${point.date}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) continue;
    const day = date.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + mondayOffset);
    const key = monday.toISOString().slice(0, 10);
    const existing = weeks.get(key);
    const high = Math.max(existing?.high ?? 0, barHigh(point));
    weeks.set(key, {
      date: key,
      close: point.close,
      high,
    });
  }
  return [...weeks.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, point]) => point);
}

export function detectTurtleBreakout(
  points: ScreenerChartPoint[],
  price: number,
  lookback: number,
  maxAgeBars: number
): TurtleBreakout {
  const empty: TurtleBreakout = {
    broken: false,
    fresh: false,
    ageBars: null,
    channelHigh: null,
    extension: null,
  };
  if (points.length < lookback + 2 || price <= 0) return empty;

  const lastIndex = points.length - 1;
  for (let age = 0; age <= maxAgeBars; age += 1) {
    const index = lastIndex - age;
    if (index < lookback) break;
    const channelHigh = maxPriorHigh(points, index, lookback);
    if (channelHigh == null) continue;
    const breakPrice =
      age === 0 ? Math.max(price, barHigh(points[index]!)) : barHigh(points[index]!);
    if (breakPrice <= channelHigh) continue;

    const priorClose = points[index - 1]?.close;
    const fresh = priorClose != null && priorClose < channelHigh;
    if (!fresh) continue;

    return {
      broken: true,
      fresh: true,
      ageBars: age,
      channelHigh,
      extension: (breakPrice - channelHigh) / channelHigh,
    };
  }

  const channelHigh = maxPriorHigh(points, lastIndex, lookback);
  return {
    ...empty,
    channelHigh,
    extension:
      channelHigh != null ? (price - channelHigh) / channelHigh : null,
  };
}
