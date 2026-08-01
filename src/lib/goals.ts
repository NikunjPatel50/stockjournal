import {
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
} from "date-fns";
import { formatSignedMoney } from "@/lib/journal-types";
import { DEFAULT_CURRENCY } from "@/lib/settings";

export type GoalPeriod = "monthly" | "quarterly" | "annual" | "all";
export type GoalCategory = "financial" | "risk" | "habit";
export type GoalStatus = "on_track" | "behind" | "achieved" | "breached";
export type MetricType =
  | "profit"
  | "win_rate"
  | "max_loss"
  | "trade_count"
  | "streak_days";

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  categoryLabel: string;
  period: Exclude<GoalPeriod, "all">;
  metricType: MetricType;
  currentValue: number;
  targetValue: number;
  startValue: number;
  startDate: string;
  endDate: string;
  status: GoalStatus;
  autoTrack: boolean;
  completed: boolean;
  dailyRate: number;
  unit: string;
}

export interface DisciplineRule {
  id: string;
  label: string;
  checked: boolean;
}

export interface WeekDayAdherence {
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
  adhered: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  requirement: string;
}

export function computeGoalProgress(goal: Goal): number {
  if (goal.metricType === "max_loss") {
    // Lower absolute loss used is better; progress toward staying under limit
    const used = Math.abs(goal.currentValue);
    const limit = Math.abs(goal.targetValue);
    if (limit === 0) return 100;
    const remaining = Math.max(limit - used, 0);
    return Math.min(100, (remaining / limit) * 100);
  }

  const span = goal.targetValue - goal.startValue;
  if (span === 0) return goal.currentValue >= goal.targetValue ? 100 : 0;
  const progress = ((goal.currentValue - goal.startValue) / span) * 100;
  return Math.max(0, Math.min(100, progress));
}

export function deriveStatus(goal: Goal): GoalStatus {
  if (goal.completed || goal.status === "achieved") return "achieved";
  if (goal.metricType === "max_loss") {
    if (Math.abs(goal.currentValue) > Math.abs(goal.targetValue)) {
      return "breached";
    }
  } else if (goal.currentValue >= goal.targetValue) {
    return "achieved";
  }

  const daysLeft = Math.max(
    differenceInCalendarDays(parseISO(goal.endDate), new Date()),
    0
  );
  const progress = computeGoalProgress(goal);
  const elapsedSpan = Math.max(
    differenceInCalendarDays(parseISO(goal.endDate), parseISO(goal.startDate)),
    1
  );
  const elapsed = Math.min(
    differenceInCalendarDays(new Date(), parseISO(goal.startDate)),
    elapsedSpan
  );
  const expected = (elapsed / elapsedSpan) * 100;

  if (progress + 8 < expected) return "behind";
  return "on_track";
}

export function daysRemaining(endDate: string): number {
  return Math.max(differenceInCalendarDays(parseISO(endDate), new Date()), 0);
}

export function formatGoalValue(value: number, metricType: MetricType, unit: string) {
  if (metricType === "profit" || metricType === "max_loss") {
    return formatSignedMoney(value, DEFAULT_CURRENCY);
  }
  if (metricType === "win_rate") return `${value.toFixed(1)}%`;
  if (unit) return `${value}${unit.startsWith(" ") ? unit : ` ${unit}`}`;
  return String(value);
}

export function pacingText(goal: Goal): string {
  if (goal.metricType === "max_loss") {
    const used = Math.abs(goal.currentValue);
    const limit = Math.abs(goal.targetValue);
    const left = Math.max(limit - used, 0);
    return `${formatSignedMoney(left, DEFAULT_CURRENCY)} risk budget remaining before limit`;
  }

  if (goal.currentValue >= goal.targetValue || goal.completed) {
    return "Target reached — maintain discipline through period end";
  }

  const remaining = goal.targetValue - goal.currentValue;
  const days = daysRemaining(goal.endDate);
  if (days === 0) return "Deadline today — finish strong or mark complete";

  const neededPerDay = remaining / days;
  if (goal.dailyRate <= 0) {
    return `Need ~${formatGoalValue(neededPerDay, goal.metricType, goal.unit)}/day to finish on time`;
  }

  const daysAtRate = Math.ceil(remaining / goal.dailyRate);
  const eta = new Date();
  eta.setDate(eta.getDate() + daysAtRate);
  const onTrack = !isBefore(parseISO(goal.endDate), eta);

  return `At ${formatGoalValue(goal.dailyRate, goal.metricType, goal.unit)}/day, est. ${format(eta, "MMM d")}${
    onTrack ? "" : " (behind pace)"
  }`;
}

export function statusLabel(status: GoalStatus): string {
  switch (status) {
    case "on_track":
      return "On Track";
    case "behind":
      return "Behind";
    case "achieved":
      return "Achieved";
    case "breached":
      return "Breached";
  }
}

export function statusClass(status: GoalStatus): string {
  switch (status) {
    case "on_track":
      return "bg-emerald-500/10 text-emerald-500";
    case "behind":
      return "bg-amber-500/10 text-amber-500";
    case "achieved":
      return "bg-emerald-500/10 text-emerald-500";
    case "breached":
      return "bg-rose-500/10 text-rose-500";
  }
}

export function progressBarClass(status: GoalStatus): string {
  switch (status) {
    case "on_track":
    case "achieved":
      return "[&_[data-slot=progress-indicator]]:bg-emerald-500";
    case "behind":
      return "[&_[data-slot=progress-indicator]]:bg-amber-500";
    case "breached":
      return "[&_[data-slot=progress-indicator]]:bg-rose-500";
  }
}

export function filterGoals(
  goals: Goal[],
  period: GoalPeriod,
  categoryTab: "all" | GoalCategory
): Goal[] {
  return goals.filter((g) => {
    if (period !== "all" && g.period !== period) return false;
    if (categoryTab === "all") return true;
    return g.category === categoryTab;
  });
}

export function computeGoalsSummary(goals: Goal[]) {
  const active = goals.filter((g) => !g.completed && deriveStatus(g) !== "achieved");
  const completed = goals.filter(
    (g) => g.completed || deriveStatus(g) === "achieved"
  );
  const completionRate = goals.length
    ? (completed.length / goals.length) * 100
    : 0;

  const monthlyPnl = goals.find(
    (g) => g.category === "financial" && g.period === "monthly" && g.metricType === "profit"
  );

  let pacing: "on_track" | "behind" | "ahead" | "none" = "none";
  let pacingLabel = "No monthly P&L goal";
  if (monthlyPnl) {
    const status = deriveStatus(monthlyPnl);
    if (status === "achieved") {
      pacing = "ahead";
      pacingLabel = "Monthly target already hit";
    } else if (status === "behind") {
      pacing = "behind";
      pacingLabel = `Behind · need faster than ${formatGoalValue(
        monthlyPnl.dailyRate,
        "profit",
        ""
      )}/day`;
    } else {
      pacing = "on_track";
      pacingLabel = `On track at ${formatGoalValue(
        monthlyPnl.dailyRate,
        "profit",
        ""
      )}/day`;
    }
  }

  return {
    activeCount: active.length,
    completedCount: completed.length,
    completionRate,
    pacing,
    pacingLabel,
    monthlyCurrent: monthlyPnl?.currentValue ?? 0,
    monthlyTarget: monthlyPnl?.targetValue ?? 0,
  };
}
