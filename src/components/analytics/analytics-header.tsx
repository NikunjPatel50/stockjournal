"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { TimeframeSegmentedControl } from "@/components/analytics/timeframe-segmented-control";
import { AppPageHeader } from "@/components/app-page-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type AnalyticsFilters,
  type AnalyticsTimeframe,
} from "@/lib/analytics";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface AnalyticsHeaderProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  title?: string;
  subtitle?: string;
}

export function AnalyticsHeader({
  filters,
  onFiltersChange,
  title = "Dashboard",
  subtitle = "Portfolio performance and execution analytics",
}: AnalyticsHeaderProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const isMobile = useIsMobile();
  const patch = (partial: Partial<AnalyticsFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const customRangeLabel =
    filters.customFrom || filters.customTo
      ? `${filters.customFrom ? format(filters.customFrom, "MMM d, yyyy") : "Start"} – ${
          filters.customTo ? format(filters.customTo, "MMM d, yyyy") : "End"
        }`
      : "Select dates";

  const setTimeframe = (timeframe: AnalyticsTimeframe) => patch({ timeframe });
  const isCustom = filters.timeframe === "custom";

  const datePicker = isCustom ? (
    <Popover open={dateOpen} onOpenChange={setDateOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-10 gap-1.5 rounded-lg border-border bg-background px-2.5",
              "text-xs font-medium shadow-none"
            )}
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-[12rem] truncate sm:max-w-none">
          {customRangeLabel}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={isMobile ? 1 : 2}
          selected={{
            from: filters.customFrom,
            to: filters.customTo,
          }}
          onSelect={(range) =>
            patch({
              customFrom: range?.from,
              customTo: range?.to,
            })
          }
        />
      </PopoverContent>
    </Popover>
  ) : null;

  return (
    <div className="space-y-4">
      <AppPageHeader
        eyebrow="Portfolio analytics"
        title={title}
        description={subtitle}
      />

      <div className="relative z-20 min-w-0 w-full pl-12 lg:pl-0">
        <div className="max-w-full overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TimeframeSegmentedControl
            value={filters.timeframe}
            onChange={setTimeframe}
            trailing={datePicker}
          />
        </div>
      </div>
    </div>
  );
}
