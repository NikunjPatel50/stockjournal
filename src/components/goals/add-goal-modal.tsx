"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  Goal,
  GoalCategory,
  MetricType,
} from "@/lib/goals";

const numberField = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v) : v))
  .refine((v) => Number.isFinite(v), "Must be a number");

const goalSchema = z.object({
  title: z.string().min(3, "Title is required"),
  category: z.enum(["financial", "risk", "habit"]),
  metricType: z.enum([
    "profit",
    "win_rate",
    "max_loss",
    "trade_count",
    "streak_days",
  ]),
  targetValue: numberField,
  startValue: numberField,
  period: z.enum(["monthly", "quarterly", "annual"]),
  autoTrack: z.boolean(),
});

type GoalFormInput = z.input<typeof goalSchema>;
type GoalFormValues = z.output<typeof goalSchema>;

interface AddGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGoal?: Goal | null;
  onSave: (goal: Goal) => void;
}

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  financial: "Financial Target",
  risk: "Risk Management",
  habit: "Execution & Habits",
};

const METRIC_LABELS: Record<MetricType, string> = {
  profit: "₹ Profit",
  win_rate: "Win Rate %",
  max_loss: "Max loss (₹)",
  trade_count: "Trade Count",
  streak_days: "Streak Days",
};

function defaultEndDate(period: GoalFormValues["period"]) {
  const d = new Date();
  if (period === "monthly") {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }
  if (period === "quarterly") {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3 + 3, 0);
  }
  return new Date(d.getFullYear(), 11, 31);
}

export function AddGoalModal({
  open,
  onOpenChange,
  initialGoal,
  onSave,
}: AddGoalModalProps) {
  const [deadline, setDeadline] = useState<Date>(defaultEndDate("monthly"));
  const [calOpen, setCalOpen] = useState(false);

  const form = useForm<GoalFormInput, unknown, GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      category: "financial",
      metricType: "profit",
      targetValue: 1000,
      startValue: 0,
      period: "monthly",
      autoTrack: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initialGoal) {
      form.reset({
        title: initialGoal.title,
        category: initialGoal.category,
        metricType: initialGoal.metricType,
        targetValue: initialGoal.targetValue,
        startValue: initialGoal.startValue,
        period: initialGoal.period,
        autoTrack: initialGoal.autoTrack,
      });
      setDeadline(new Date(initialGoal.endDate));
    } else {
      form.reset({
        title: "",
        category: "financial",
        metricType: "profit",
        targetValue: 1000,
        startValue: 0,
        period: "monthly",
        autoTrack: true,
      });
      setDeadline(defaultEndDate("monthly"));
    }
  }, [open, initialGoal, form]);

  function onSubmit(values: GoalFormValues) {
    const unit =
      values.metricType === "win_rate"
        ? "%"
        : values.metricType === "trade_count"
          ? "trades"
          : values.metricType === "streak_days"
            ? "days"
            : "";

    const goal: Goal = {
      id: initialGoal?.id ?? crypto.randomUUID(),
      title: values.title,
      category: values.category,
      categoryLabel: CATEGORY_LABELS[values.category],
      period: values.period,
      metricType: values.metricType,
      currentValue: initialGoal?.currentValue ?? values.startValue,
      targetValue: values.targetValue,
      startValue: values.startValue,
      startDate:
        initialGoal?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: format(deadline, "yyyy-MM-dd"),
      status: initialGoal?.status ?? "on_track",
      autoTrack: values.autoTrack,
      completed: initialGoal?.completed ?? false,
      dailyRate: initialGoal?.dailyRate ?? 0,
      unit,
    };

    onSave(goal);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialGoal ? "Edit Goal" : "Set New Goal"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Goal Title</Label>
            <Input
              placeholder="Achieve ₹5,00,000 net profit in Q3"
              {...form.register("title")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) =>
                  v && form.setValue("category", v as GoalCategory)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="habit">Habit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Select
                value={form.watch("period")}
                onValueChange={(v) => {
                  if (v === "monthly" || v === "quarterly" || v === "annual") {
                    form.setValue("period", v);
                    if (!initialGoal) setDeadline(defaultEndDate(v));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Target Metric Type</Label>
            <Select
              value={form.watch("metricType")}
              onValueChange={(v) =>
                v && form.setValue("metricType", v as MetricType)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) =>
                    METRIC_LABELS[value as MetricType] ?? String(value ?? "")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METRIC_LABELS) as MetricType[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METRIC_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starting Value</Label>
              <Input
                type="number"
                step="any"
                {...form.register("startValue")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Value</Label>
              <Input
                type="number"
                step="any"
                {...form.register("targetValue")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 border-border"
                  />
                }
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                {format(deadline, "MMM d, yyyy")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={(d) => {
                    if (d) {
                      setDeadline(d);
                      setCalOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Auto-track from trades</p>
              <p className="text-xs text-muted-foreground">
                Sync progress using logged journal data
              </p>
            </div>
            <Switch
              checked={!!form.watch("autoTrack")}
              onCheckedChange={(checked) =>
                form.setValue("autoTrack", !!checked)
              }
            />
          </div>

          {Object.keys(form.formState.errors).length > 0 ? (
            <p className="text-sm text-rose-500">
              Please complete all required fields.
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-600/90"
            >
              {initialGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
