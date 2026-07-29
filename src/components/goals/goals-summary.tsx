import { Flame, Gauge, Target, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatGoalValue, type computeGoalsSummary } from "@/lib/goals";
import { NUMERIC_DISPLAY_CLASS, cn } from "@/lib/utils";

interface GoalsSummaryProps {
  summary: ReturnType<typeof computeGoalsSummary>;
  disciplineStreak: number;
}

export function GoalsSummary({ summary, disciplineStreak }: GoalsSummaryProps) {
  const completion = Math.round(summary.completionRate);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (completion / 100) * circumference;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Total Active Goals
            </p>
            <Target className="size-4 text-muted-foreground" />
          </div>
          <p className={cn("mt-2 text-2xl font-semibold", NUMERIC_DISPLAY_CLASS)}>
            {summary.activeCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.activeCount} Active / {summary.completedCount} Completed
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-4 pt-4 pb-4">
          <div className="relative size-20 shrink-0">
            <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/40"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="text-emerald-500 transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-sm font-semibold", NUMERIC_DISPLAY_CLASS)}>{completion}%</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Goal Completion
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Overall achievement rate across selected period
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Monthly P&L Pacing
            </p>
            <Gauge className="size-4 text-muted-foreground" />
          </div>
          <p className={cn("mt-2 text-lg font-semibold", NUMERIC_DISPLAY_CLASS)}>
            {formatGoalValue(summary.monthlyCurrent, "profit", "")}
            <span className="text-sm text-muted-foreground">
              {" "}
              / {formatGoalValue(summary.monthlyTarget, "profit", "")}
            </span>
          </p>
          <Badge
            className={
              summary.pacing === "on_track" || summary.pacing === "ahead"
                ? "mt-2 bg-emerald-500/10 text-emerald-500"
                : summary.pacing === "behind"
                  ? "mt-2 bg-amber-500/10 text-amber-500"
                  : "mt-2 bg-slate-500/10 text-slate-400"
            }
          >
            {summary.pacingLabel}
          </Badge>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Discipline Streak
            </p>
            <Flame className="size-4 text-amber-500" />
          </div>
          <p className={cn("mt-2 text-2xl font-semibold text-amber-500", NUMERIC_DISPLAY_CLASS)}>
            {disciplineStreak}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Trophy className="size-3.5" />
            Days no overtrading
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
