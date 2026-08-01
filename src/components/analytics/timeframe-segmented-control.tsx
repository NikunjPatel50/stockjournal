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
}: {
  value: AnalyticsTimeframe;
  onChange: (value: AnalyticsTimeframe) => void;
  className?: string;
  /** Shown after presets (e.g. custom date range picker). */
  trailing?: ReactNode;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") {
          onChange(next as AnalyticsTimeframe);
        }
      }}
      className={cn("w-auto min-w-0", className)}
    >
      <div
        className={cn(
          "flex max-w-none flex-nowrap items-center gap-2",
          "w-full max-md:min-w-0 max-md:overflow-x-auto max-md:overscroll-x-contain",
          "max-md:pb-0.5 max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none]",
          "max-md:[&::-webkit-scrollbar]:hidden",
          "md:w-max"
        )}
      >
        <TabsList
          className={cn(
            "inline-flex h-10 w-max max-w-none flex-nowrap items-center gap-0.5",
            "group-data-horizontal/tabs:h-10",
            "rounded-lg border border-border bg-muted/60 p-1",
            "shadow-none dark:bg-muted/40"
          )}
        >
          {DASHBOARD_TIMEFRAME_OPTIONS.map((tf) => (
            <TabsTrigger
              key={tf.value}
              value={tf.value}
              className={cn(
                "h-8 flex-none rounded-md border border-transparent px-2 py-0",
                "text-[11px] font-medium tracking-wide text-muted-foreground sm:px-3 sm:text-xs",
                "shadow-none transition-colors hover:bg-background/60 hover:text-foreground",
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
        {trailing}
      </div>
    </Tabs>
  );
}
