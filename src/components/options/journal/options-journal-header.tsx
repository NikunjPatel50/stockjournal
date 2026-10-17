"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  Download,
  Plus,
  RotateCcw,
  Search,
  Upload,
} from "lucide-react";
import { TimeframeSegmentedControl } from "@/components/analytics/timeframe-segmented-control";
import { AppPageHeader } from "@/components/app-page-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsTimeframe } from "@/lib/analytics";
import {
  emptyOptionsJournalFilters,
  OPTIONS_STATUS_TABS,
  OPTIONS_STRATEGY_FILTERS,
  type OptionsJournalFilters,
  type OptionsStatusTab,
  type OptionsStrategyCategory,
} from "@/lib/options-journal";
import { useIsCompactApp } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const TOOLBAR_FIELD_CLASS =
  "h-9 rounded-lg border-0 bg-muted/40 shadow-none ring-1 ring-inset ring-border/60 transition-[box-shadow] focus-within:ring-2 focus-within:ring-primary/25 dark:bg-muted/25";

type OptionsJournalHeaderProps = {
  filters: OptionsJournalFilters;
  onFiltersChange: (filters: OptionsJournalFilters) => void;
  onLogTrade: () => void;
  onExportCsv?: () => void;
};

export function OptionsJournalHeader({
  filters,
  onFiltersChange,
  onLogTrade,
  onExportCsv,
}: OptionsJournalHeaderProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const isCompact = useIsCompactApp();

  const patch = (partial: Partial<OptionsJournalFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const isCustom = filters.timeframe === "custom";
  const customRangeLabel =
    filters.customFrom || filters.customTo
      ? `${filters.customFrom ? format(filters.customFrom, "MMM d, yyyy") : "Start"} – ${
          filters.customTo ? format(filters.customTo, "MMM d, yyyy") : "End"
        }`
      : "Select dates";

  const datePicker = isCustom ? (
    <Popover open={dateOpen} onOpenChange={setDateOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-md border-border/70 bg-background/80 px-2.5 text-xs font-medium shadow-none"
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-[12rem] truncate sm:max-w-none">
          {customRangeLabel}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[calc(100vw-2rem)] p-0"
        align={isCompact ? "center" : "start"}
      >
        <Calendar
          mode="range"
          numberOfMonths={isCompact ? 1 : 2}
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

  const hasActiveFilters =
    filters.search ||
    filters.timeframe !== "all" ||
    filters.statusTab !== "all" ||
    filters.strategyCategory !== "all";

  return (
    <div className="space-y-4">
      <AppPageHeader
        title="Options Journal"
        description="Strategy-first book for spreads, condors, and multi-leg structures—grouped by setup, not disconnected fills."
      />

      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div
            className={cn(
              "relative min-w-0 flex-1 lg:max-w-md",
              TOOLBAR_FIELD_CLASS,
              "h-9 sm:h-10"
            )}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={filters.search}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder="Underlying, strategy, tags…"
              className="h-9 w-full border-0 bg-transparent pl-10 text-sm shadow-none focus-visible:ring-0 sm:h-10"
            />
          </div>

          <Tabs
            value={filters.statusTab}
            onValueChange={(value) => {
              if (typeof value === "string") {
                patch({ statusTab: value as OptionsStatusTab });
              }
            }}
            className="min-w-0"
          >
            <TabsList className="inline-flex h-9 w-full flex-wrap justify-start gap-0.5 rounded-lg border border-border/70 bg-background/70 p-0.5 shadow-none sm:w-auto">
              {OPTIONS_STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-7 flex-none rounded-md px-2.5 text-xs font-medium data-active:bg-primary/15 data-active:text-primary"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Select
            value={filters.strategyCategory}
            onValueChange={(value) => {
              if (value) patch({ strategyCategory: value as OptionsStrategyCategory });
            }}
          >
            <SelectTrigger className="h-9 w-[11.5rem] rounded-lg border-border bg-card text-xs shadow-none">
              <SelectValue placeholder="Strategy type" />
            </SelectTrigger>
            <SelectContent align="end">
              {OPTIONS_STRATEGY_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-2.5 text-muted-foreground"
              onClick={() => onFiltersChange(emptyOptionsJournalFilters())}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          ) : null}

          {onExportCsv ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-2.5 text-muted-foreground"
              onClick={onExportCsv}
            >
              <Download className="size-3.5" />
              Export
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-2.5 text-muted-foreground"
              disabled
              title="Broker CSV import coming soon"
            >
              <Upload className="size-3.5" />
              Import
            </Button>
          )}

          <Button
            size="sm"
            className="h-9 gap-1.5 shadow-none"
            onClick={onLogTrade}
          >
            <Plus className="size-3.5" />
            Log position
          </Button>
        </div>
      </div>

      <TimeframeSegmentedControl
        value={filters.timeframe}
        onChange={(timeframe: AnalyticsTimeframe) => patch({ timeframe })}
        trailing={datePicker}
        compact
      />
    </div>
  );
}
