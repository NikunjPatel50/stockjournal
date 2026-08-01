import type { Goal } from "@/lib/goals";

type GoalRow = {
  id: string;
  title: string;
  category: string;
  category_label: string;
  period: string;
  metric_type: string;
  current_value: number | string;
  target_value: number | string;
  start_value: number | string;
  start_date: string;
  end_date: string;
  status: string;
  auto_track: boolean;
  completed: boolean;
  daily_rate: number | string;
  unit: string;
  updated_at?: string;
};

function num(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function goalFromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    category: row.category as Goal["category"],
    categoryLabel: row.category_label,
    period: row.period as Goal["period"],
    metricType: row.metric_type as Goal["metricType"],
    currentValue: num(row.current_value),
    targetValue: num(row.target_value),
    startValue: num(row.start_value),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as Goal["status"],
    autoTrack: row.auto_track,
    completed: row.completed,
    dailyRate: num(row.daily_rate),
    unit: row.unit ?? "",
  };
}

export function goalToRow(goal: Goal, userId: string) {
  return {
    id: goal.id,
    user_id: userId,
    title: goal.title,
    category: goal.category,
    category_label: goal.categoryLabel,
    period: goal.period,
    metric_type: goal.metricType,
    current_value: goal.currentValue,
    target_value: goal.targetValue,
    start_value: goal.startValue,
    start_date: goal.startDate,
    end_date: goal.endDate,
    status: goal.status,
    auto_track: goal.autoTrack,
    completed: goal.completed,
    daily_rate: goal.dailyRate,
    unit: goal.unit,
  };
}

export function goalUpdatedAtMs(row: GoalRow): number {
  if (!row.updated_at) return 0;
  const ms = Date.parse(row.updated_at);
  return Number.isFinite(ms) ? ms : 0;
}
