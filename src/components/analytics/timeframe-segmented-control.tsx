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
      className={cn("w-full min-w-0 sm:w-auto", className)}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-max sm:flex-nowrap sm:gap-2">
        <TabsList
          className={cn(
            "flex h-auto! w-full flex-wrap items-center justify-start gap-0.5",
            "group-data-horizontal/tabs:h-auto!",
            "sm:inline-flex sm:w-max sm:flex-none sm:flex-nowrap",
            compact
              ? "p-0.5 sm:h-9 sm:group-data-horizontal/tabs:h-9"
              : "p-1 sm:h-10 sm:group-data-horizontal/tabs:h-10",
            "rounded-lg border border-border/70 bg-background/70",
            "shadow-none dark:bg-background/40"
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
