"use client";

import { useRef, useState, type ReactNode } from "react";
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
import type { AnalyticsTimeframe } from "@/lib/analytics";
import { emptyFilters, type JournalFilters } from "@/lib/journal-types";
import { useIsCompactApp } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const TOOLBAR_FIELD_CLASS =
  "h-9 rounded-lg border-0 bg-muted/40 shadow-none ring-1 ring-inset ring-border/60 transition-[box-shadow] focus-within:ring-2 focus-within:ring-primary/25 dark:bg-muted/25";

function ToolbarLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 lg:inline",
        className
      )}
    >
      {children}
    </span>
  );
}

function ToolbarSection({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2 sm:gap-2.5", className)}>
      {label ? <ToolbarLabel>{label}</ToolbarLabel> : null}
      {children}
    </div>
  );
}

interface JournalHeaderProps {
  filters: JournalFilters;
  onFiltersChange: (filters: JournalFilters) => void;
  onLogTrade: () => void;
  onExportCsv: () => void;
  onImportFile: (file: File) => void;
}

export function JournalHeader({
  filters,
  onFiltersChange,
  onLogTrade,
  onExportCsv,
  onImportFile,
}: JournalHeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const isCompact = useIsCompactApp();

  const patch = (partial: Partial<JournalFilters>) =>
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
            className={cn(
              "h-8 gap-1.5 rounded-md border-border/70 bg-background/80 px-2.5",
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
    filters.outcome !== "all";

  return (
    <div className="space-y-4">
      <AppPageHeader eyebrow="Trade log" title="Journal" />

      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <ToolbarSection className="min-w-0 flex-1">
            <div
              className={cn(
                "relative min-w-0 flex-1 sm:min-w-[14rem] sm:max-w-md lg:max-w-lg xl:max-w-xl",
                TOOLBAR_FIELD_CLASS,
                "h-9 sm:h-10"
              )}
            >
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={filters.search}
                onChange={(e) => patch({ search: e.target.value })}
                placeholder="Ticker, notes, tags…"
                className="h-9 w-full border-0 bg-transparent pl-10 text-sm shadow-none focus-visible:ring-0 sm:h-10"
              />
            </div>
          </ToolbarSection>

          <ToolbarSection label="Period" className="min-w-0">
            <div className="min-w-0 overflow-x-auto overscroll-x-contain">
              <TimeframeSegmentedControl
                value={filters.timeframe}
                onChange={(timeframe: AnalyticsTimeframe) =>
                  patch({ timeframe })
                }
                trailing={datePicker}
                compact
                className="min-w-max"
              />
            </div>

            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => onFiltersChange(emptyFilters())}
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            ) : null}
          </ToolbarSection>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
          <ToolbarLabel className="lg:hidden">Data</ToolbarLabel>
          <div className="inline-flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-md px-2.5 text-muted-foreground hover:text-foreground"
              onClick={onExportCsv}
              aria-label="Export CSV"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-md px-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => fileRef.current?.click()}
              aria-label="Import CSV"
            >
              <Upload className="size-3.5" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-md px-2.5 shadow-none"
              onClick={onLogTrade}
            >
              <Plus className="size-3.5" />
              Log trade
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
