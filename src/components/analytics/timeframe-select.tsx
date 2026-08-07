"use client";

import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DASHBOARD_TIMEFRAME_OPTIONS,
  type AnalyticsTimeframe,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function TimeframeSelect({
  value,
  onChange,
  className,
  trailing,
}: {
  value: AnalyticsTimeframe;
  onChange: (value: AnalyticsTimeframe) => void;
  className?: string;
  /** Shown after the dropdown (e.g. custom date range picker). */
  trailing?: ReactNode;
}) {
  const selectedLabel =
    DASHBOARD_TIMEFRAME_OPTIONS.find((option) => option.value === value)
      ?.label ?? "Period";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as AnalyticsTimeframe);
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-8 min-w-[6.5rem] border-border bg-background text-xs font-medium shadow-none"
          aria-label="Time period"
        >
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {DASHBOARD_TIMEFRAME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {trailing}
    </div>
  );
}
