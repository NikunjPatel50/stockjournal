"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DASHBOARD_TIMEFRAME_OPTIONS,
  type AnalyticsTimeframe,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function TimeframeSegmentedControl({
  value,
  onChange,
  className,
  trailing,
  compact = false,
}: {
  value: AnalyticsTimeframe;
  onChange: (value: AnalyticsTimeframe) => void;
  className?: string;
  /** Shown after presets (e.g. custom date range picker). */
  trailing?: ReactNode;
  compact?: boolean;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") {
          onChange(next as AnalyticsTimeframe);
        }
      }}
      className={cn("min-w-0", className)}
    >
      <div className="inline-flex min-w-max flex-nowrap items-center gap-2">
        <TabsList
          className={cn(
            "inline-flex w-max flex-none flex-nowrap items-center gap-0.5",
            compact ? "h-9 p-0.5" : "h-10 p-1",
            "group-data-horizontal/tabs:h-10",
            "rounded-lg border border-border bg-muted/60",
            "shadow-none dark:bg-muted/40"
          )}
        >
          {DASHBOARD_TIMEFRAME_OPTIONS.map((tf) => (
            <TabsTrigger
              key={tf.value}
              value={tf.value}
              className={cn(
                "flex-none rounded-md border border-transparent py-0 shadow-none transition-colors",
                compact
                  ? "h-7 px-2 text-[10px]"
                  : "h-8 px-2 text-[11px] sm:px-3 sm:text-xs",
                "font-medium tracking-wide text-muted-foreground",
                "hover:bg-background/60 hover:text-foreground",
                "focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-offset-0",
                "after:hidden",
                "group-data-[variant=default]/tabs-list:data-active:ring-0",
                "group-data-[variant=default]/tabs-list:data-active:shadow-none",
                "data-active:border-primary/25 data-active:bg-primary/15",
                "data-active:font-semibold data-active:text-primary",
                "data-active:shadow-none",
                "dark:data-active:border-primary/30 dark:data-active:bg-primary/20",
                "dark:data-active:text-primary"
              )}
            >
              <span className="whitespace-nowrap">{tf.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {trailing ? (
          <div className="flex shrink-0 items-center">{trailing}</div>
        ) : null}
      </div>
    </Tabs>
  );
}
