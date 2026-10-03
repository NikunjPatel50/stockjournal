"use client";

import { useMemo } from "react";
import {
  BarChart3,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
} from "recharts";
import { MetricHint } from "@/components/ui/metric-hint";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  computeAiPerformanceRating,
  ratingToRadarData,
  type PerformanceDimension,
  type PerformanceDimensionId,
} from "@/lib/ai-performance-rating";
import type { JournalTrade } from "@/lib/journal-types";
import { APP_CARD_SURFACE_CLASS } from "@/lib/app-shell";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

const RADAR_BLUE = "#3b82f6";
const RADAR_BLUE_LIGHT = "#60a5fa";

const radarConfig = {
  score: {
    label: "Score",
    color: RADAR_BLUE,
  },
} satisfies ChartConfig;

const BAR_COLORS: Record<PerformanceDimensionId, string> = {
  winRate: "bg-orange-500",
  riskReward: "bg-emerald-500",
  consistency: "bg-blue-500",
  maxDrawdown: "bg-rose-500",
  profitability: "bg-cyan-500",
  recovery: "bg-lime-500",
};

const BAR_ICONS: Record<PerformanceDimensionId, string> = {
  winRate: "🎯",
  riskReward: "⚖️",
  consistency: "📊",
  maxDrawdown: "📉",
  profitability: "💰",
  recovery: "🔄",
};

type AiPerformanceRatingCardProps = {
  trades: JournalTrade[];
  capitalBase: number;
};

function ScoreBar({ dimension }: { dimension: PerformanceDimension }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_2.25rem] items-center gap-x-2 gap-y-0.5">
      <span className="text-sm leading-none" aria-hidden>
        {BAR_ICONS[dimension.id]}
      </span>
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-1">
          <span className="truncate text-xs font-medium text-foreground">
            {dimension.label}
          </span>
          <MetricHint title={dimension.label} hint={dimension.hint} size="sm" />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              BAR_COLORS[dimension.id]
            )}
            style={{ width: `${dimension.score}%` }}
          />
        </div>
      </div>
      <span
        className={cn(
          "text-right text-sm font-semibold tabular-nums text-foreground",
          NUMERIC_DISPLAY_CLASS
        )}
      >
        {dimension.score}
      </span>
    </div>
  );
}

export function AiPerformanceRatingCard({
  trades,
  capitalBase,
}: AiPerformanceRatingCardProps) {
  const equityBase = capitalBase > 0 ? capitalBase : 10000;

  const display = useMemo(
    () => computeAiPerformanceRating(trades, equityBase),
    [trades, equityBase]
  );

  const chartData = useMemo(
    () => ratingToRadarData(display.dimensions),
    [display.dimensions]
  );

  return (
    <section className={APP_CARD_SURFACE_CLASS}>
      <div className="border-b border-border/70 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
              aria-hidden
            >
              <Sparkles className="size-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                SwingTradingLog AI
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                AI-Powered Performance Rating
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-end gap-3 sm:flex-col sm:items-end sm:text-right">
            <p
              className={cn(
                "text-4xl font-bold leading-none tabular-nums text-primary sm:text-5xl",
                NUMERIC_DISPLAY_CLASS
              )}
            >
              {display.insufficientData ? "—" : display.overallScore}
            </p>
            <div>
              <p className="text-sm font-semibold text-primary">
                {display.insufficientData ? "Not enough data" : display.tier}
              </p>
              <p className="text-[11px] text-muted-foreground">out of 100</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-h-[220px] min-w-0">
          <ChartContainer
            config={radarConfig}
            className="mx-auto aspect-square max-h-[280px] w-full"
          >
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="var(--border)" strokeOpacity={0.6} />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke={RADAR_BLUE_LIGHT}
                fill={RADAR_BLUE}
                fillOpacity={0.48}
                strokeWidth={2}
                dot={{
                  r: 4,
                  fill: RADAR_BLUE_LIGHT,
                  stroke: "#93c5fd",
                  strokeWidth: 1,
                }}
              />
            </RadarChart>
          </ChartContainer>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Target className="size-4 text-violet-500" aria-hidden />
              <h3 className="text-sm font-semibold text-foreground">
                Score Breakdown
              </h3>
            </div>
            <div className="space-y-3.5">
              {display.dimensions.map((dimension) => (
                <ScoreBar key={dimension.id} dimension={dimension} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 px-3.5 py-3.5 sm:px-4">
            <div className="mb-2.5 flex items-center gap-2">
              <Sparkles className="size-4 text-violet-500" aria-hidden />
              <h4 className="text-sm font-semibold text-foreground">
                AI Improvement Tips
              </h4>
            </div>
            <ul className="space-y-2.5 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
              {display.tips.map((tip, index) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-foreground/80">
                    {index === 0 ? (
                      <Lightbulb className="size-3.5 text-amber-500" />
                    ) : index === display.tips.length - 1 &&
                      tip.includes("elite") ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    ) : (
                      <BarChart3 className="size-3.5 text-rose-500" />
                    )}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
