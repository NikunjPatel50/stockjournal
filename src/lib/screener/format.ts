import { subDays } from "date-fns";
import { formatPercent } from "@/lib/analytics";
import {
  SCREENER_PERIOD_LOOKBACK_DAYS,
  type ScreenerChartPoint,
  type ScreenerPeriod,
} from "@/lib/screener/types";

export function formatChangePercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const formatted = formatPercent(Math.abs(value), 2);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function changeToneClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return "text-muted-foreground";
  }
  return value > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
}

export function heatBackground(
  value: number | null,
  maxAbs: number
): string | undefined {
  if (value == null || !Number.isFinite(value) || maxAbs <= 0) {
    return undefined;
  }
  const intensity = Math.min(Math.abs(value) / maxAbs, 1);
  const alpha = 0.12 + intensity * 0.42;
  return value >= 0
    ? `rgba(16, 185, 129, ${alpha})`
    : `rgba(244, 63, 94, ${alpha})`;
}

export function chartForPeriod(
  chart: ScreenerChartPoint[],
  period: ScreenerPeriod
): ScreenerChartPoint[] {
  if (chart.length === 0) return [];
  if (period === "3y") return chart;

  const last = chart[chart.length - 1];
  if (!last) return chart;
  const cutoff = subDays(
    new Date(`${last.date}T00:00:00`),
    SCREENER_PERIOD_LOOKBACK_DAYS[period]
  )
    .toISOString()
    .slice(0, 10);

  const filtered = chart.filter((point) => point.date >= cutoff);
  return filtered.length > 1 ? filtered : chart.slice(-2);
}

export function formatAsOf(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return "—";
  }
}

export function formatScreenerStamp(
  sessionDate?: string | null,
  asOf?: string | null
): string {
  if (sessionDate) {
    const [year, month, day] = sessionDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0));
    const label = date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    return `Last close · ${label}`;
  }
  return `${formatAsOf(asOf ?? null)} IST`;
}
