import type { ScreenerChartPoint } from "@/lib/screener/types";

export type EmaSupport = {
  ema50: number | null;
  ema200: number | null;
  above50: boolean;
  above200: boolean;
  touching50: boolean;
  touching200: boolean;
  dist50: number | null;
  dist200: number | null;
  holding: boolean;
};

export function emaSeries(
  values: number[],
  period: number
): Array<number | null> {
  const series: Array<number | null> = values.map(() => null);
  if (values.length < period) return series;

  const seed = values.slice(0, period);
  let ema = seed.reduce((sum, value) => sum + value, 0) / period;
  const k = 2 / (period + 1);
  if (Number.isFinite(ema) && ema > 0) {
    series[period - 1] = ema;
  }

  for (let index = period; index < values.length; index += 1) {
    const price = values[index];
    if (price == null || !Number.isFinite(price)) continue;
    ema = price * k + ema * (1 - k);
    series[index] = Number.isFinite(ema) && ema > 0 ? ema : null;
  }
  return series;
}

function lastEma(values: number[], period: number): number | null {
  const series = emaSeries(values, period);
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = series[index];
    if (value != null) return value;
  }
  return null;
}

export function toWeeklyCloses(chart: ScreenerChartPoint[]): number[] {
  const weeks = new Map<string, number>();
  for (const point of chart) {
    if (!Number.isFinite(point.close) || point.close <= 0) continue;
    const date = new Date(`${point.date}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) continue;
    const day = date.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + mondayOffset);
    const key = monday.toISOString().slice(0, 10);
    weeks.set(key, point.close);
  }
  return [...weeks.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, close]) => close);
}

export function computeEmaSupport(
  closes: number[],
  price: number,
  band: number
): EmaSupport {
  const ema50 = lastEma(closes, 50);
  const ema200 = lastEma(closes, 200);
  const dist50 =
    ema50 != null && ema50 > 0 ? (price - ema50) / ema50 : null;
  const dist200 =
    ema200 != null && ema200 > 0 ? (price - ema200) / ema200 : null;
  const above50 = dist50 != null && dist50 >= 0;
  const above200 = dist200 != null && dist200 >= 0;
  const touching50 = dist50 != null && dist50 >= 0 && dist50 <= band;
  const touching200 = dist200 != null && dist200 >= 0 && dist200 <= band;

  return {
    ema50,
    ema200,
    above50,
    above200,
    touching50,
    touching200,
    dist50,
    dist200,
    holding: touching200,
  };
}
