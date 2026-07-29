"use client";

import { CheckCircle2, Link2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  computeGoalProgress,
  daysRemaining,
  deriveStatus,
  formatGoalValue,
  pacingText,
  progressBarClass,
  statusClass,
  statusLabel,
  type Goal,
} from "@/lib/goals";
import { NUMERIC_DISPLAY_CLASS, cn } from "@/lib/utils";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onToggleComplete: (goal: Goal) => void;
  onViewTrades: (goal: Goal) => void;
}

export function GoalCard({
  goal,
  onEdit,
  onToggleComplete,
  onViewTrades,
}: GoalCardProps) {
  const status = deriveStatus(goal);
  const progress = computeGoalProgress(goal);
  const remaining = daysRemaining(goal.endDate);

  return (
    <Card className="flex h-full flex-col border-border bg-card">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-border text-xs">
            {goal.categoryLabel}
          </Badge>
          <Badge className={statusClass(status)}>{statusLabel(status)}</Badge>
          {goal.autoTrack ? (
            <Badge className="bg-indigo-500/10 text-indigo-400">Auto-track</Badge>
          ) : null}
        </div>
        <h3 className="text-base font-semibold leading-snug">{goal.title}</h3>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Current / Target
            </p>
            <p className={cn("mt-1 text-sm font-semibold", NUMERIC_DISPLAY_CLASS)}>
              <span
                className={
                  status === "breached"
                    ? "text-rose-500"
                    : status === "achieved"
                      ? "text-emerald-500"
                      : ""
                }
              >
                {formatGoalValue(
                  goal.currentValue,
                  goal.metricType,
                  goal.unit
                )}
              </span>
              <span className="text-muted-foreground">
                {" "}
                /{" "}
                {formatGoalValue(goal.targetValue, goal.metricType, goal.unit)}
              </span>
            </p>
          </div>
          <Badge variant="outline" className="border-border text-xs">
            {remaining} days remaining
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className={NUMERIC_DISPLAY_CLASS}>{progress.toFixed(0)}%</span>
          </div>
          <Progress
            value={progress}
            className={`w-full [&_[data-slot=progress-track]]:h-2 ${progressBarClass(status)}`}
          />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {pacingText(goal)}
        </p>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => onEdit(goal)}
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
        {goal.autoTrack ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => onViewTrades(goal)}
          >
            <Link2 className="size-3.5" />
            Linked Trades
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={goal.completed ? "secondary" : "default"}
          className={
            goal.completed
              ? "gap-1"
              : "gap-1 bg-emerald-600 hover:bg-emerald-600/90"
          }
          onClick={() => onToggleComplete(goal)}
        >
          <CheckCircle2 className="size-3.5" />
          {goal.completed ? "Completed" : "Mark Completed"}
        </Button>
      </CardFooter>
    </Card>
  );
}
