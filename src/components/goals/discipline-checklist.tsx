"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { DisciplineRule, WeekDayAdherence } from "@/lib/goals";

interface DisciplineChecklistProps {
  rules: DisciplineRule[];
  week: WeekDayAdherence[];
  onToggleRule: (id: string) => void;
  onToggleDay: (day: WeekDayAdherence["day"]) => void;
}

export function DisciplineChecklist({
  rules,
  week,
  onToggleRule,
  onToggleDay,
}: DisciplineChecklistProps) {
  const checkedCount = rules.filter((r) => r.checked).length;
  const weekScore = week.filter((d) => d.adhered).length;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Discipline & Rule Adherence
            </CardTitle>
            <CardDescription>
              Daily non-negotiables for process-first trading
            </CardDescription>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-500">
            {checkedCount}/{rules.length} today · {weekScore}/5 this week
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          {rules.map((rule) => (
            <label
              key={rule.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 transition-colors hover:bg-muted/30"
            >
              <Checkbox
                checked={rule.checked}
                onCheckedChange={() => onToggleRule(rule.id)}
                className="mt-0.5"
              />
              <span
                className={`text-sm ${
                  rule.checked
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {rule.label}
              </span>
            </label>
          ))}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Weekly Consistency
          </p>
          <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2 sm:grid-cols-5">
            {week.map((day) => (
              <button
                key={day.day}
                type="button"
                onClick={() => onToggleDay(day.day)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs transition-colors ${
                  day.adhered
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border-border bg-background/40 text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <span className="font-medium">{day.day}</span>
                <span
                  className={`flex size-6 items-center justify-center rounded-full ${
                    day.adhered ? "bg-emerald-500/20" : "bg-muted"
                  }`}
                >
                  {day.adhered ? <Check className="size-3.5" /> : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
