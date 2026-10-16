import type { PortfolioTimelinePoint } from "@/lib/portfolio-timeline";

export type ComparisonPoint = {
  date: string;
  you: number;
  benchmark: number | null;
};

function roundPct(value: number) {
  return Math.round(value * 100) / 100;
}

/** Percent change in P&L over the window, measured against starting portfolio value. */
export function portfolioWindowReturnSeries(
  series: PortfolioTimelinePoint[]
): { date: string; value: number }[] {
  if (series.length === 0) return [];

  const startPnl = series[0].totalPnl;
  const startValue = series[0].portfolioValue;
  const deployed = Math.max(
    ...series.map((point) => point.invested),
    Math.abs(startValue)
  );
  const base = startValue !== 0 ? Math.abs(startValue) : deployed;

  return series.map((point) => ({
    date: point.date,
    value:
      base > 0
        ? roundPct(((point.totalPnl - startPnl) / base) * 100)
        : 0,
  }));
}

/** Index each close against the first close in the window. */
export function indexReturnSeries(
  points: { date: string; value: number }[]
): { date: string; value: number }[] {
  const start = points.find((point) => point.value > 0)?.value;
  if (start == null) {
    return points.map((point) => ({ date: point.date, value: 0 }));
  }

  return points.map((point) => ({
    date: point.date,
    value: point.value > 0 ? roundPct((point.value / start - 1) * 100) : 0,
  }));
}

/** Carry the latest known return onto every date so the two lines share one axis. */
export function alignComparisonSeries(
  you: { date: string; value: number }[],
  benchmark: { date: string; value: number }[]
): ComparisonPoint[] {
  const dates = [
    ...new Set([
      ...you.map((point) => point.date),
      ...benchmark.map((point) => point.date),
    ]),
  ].sort();
  const youByDate = new Map(you.map((point) => [point.date, point.value]));
  const benchmarkByDate = new Map(
    benchmark.map((point) => [point.date, point.value])
  );

  let youValue = 0;
  let benchmarkValue: number | null = null;
  let seenYou = false;
  let seenBenchmark = false;
  const aligned: ComparisonPoint[] = [];

  for (const date of dates) {
    const nextYou = youByDate.get(date);
    if (nextYou != null) {
      youValue = nextYou;
      seenYou = true;
    }
    const nextBenchmark = benchmarkByDate.get(date);
    if (nextBenchmark != null) {
      benchmarkValue = nextBenchmark;
      seenBenchmark = true;
    }
    if (!seenYou && !seenBenchmark) continue;
    aligned.push({
      date,
      you: seenYou ? youValue : 0,
      benchmark: seenBenchmark ? benchmarkValue : null,
    });
  }

  return aligned;
}

export function comparisonSummary(points: ComparisonPoint[]) {
  const last = points.at(-1);
  const you = last?.you ?? 0;
  const benchmark = last?.benchmark ?? null;
  return {
    you,
    benchmark,
    spread: benchmark == null ? null : roundPct(you - benchmark),
  };
}
