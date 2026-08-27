"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  CircleDot,
  Download,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { TimeframeSegmentedControl } from "@/components/analytics/timeframe-segmented-control";
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
} from "@/components/ui/select";
import { AppPageHeader } from "@/components/app-page-header";
import type { AnalyticsTimeframe } from "@/lib/analytics";
import { emptyFilters, type JournalFilters } from "@/lib/journal-types";
import { useIsCompactApp } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses", dotClass: "bg-muted-foreground/50" },
  { value: "Closed", label: "Closed", dotClass: "bg-muted-foreground" },
  { value: "Active", label: "Active", dotClass: "bg-emerald-500" },
] as const;

function statusFilterLabel(value: string) {
  return (
    STATUS_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "Status"
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

  const statusLabel =
    filters.status === "all" ? "Status" : statusFilterLabel(filters.status);

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
              "h-9 gap-1.5 rounded-lg border-border bg-background px-2.5",
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
    filters.outcome !== "all" ||
    filters.status !== "all";

  return (
    <div className="space-y-6">
      <AppPageHeader title="Journal" />

      <div className="min-w-0 rounded-lg border border-border bg-card shadow-none">
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain p-3 sm:gap-3 sm:p-4">
          <div className="relative w-44 shrink-0 sm:w-52 lg:w-60">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder="Search ticker, notes, tags…"
              className="h-9 w-full border-border bg-background pl-9"
            />
          </div>

          <Select
            value={filters.status}
            onValueChange={(v) => v && patch({ status: v })}
          >
            <SelectTrigger
              className={cn(
                "h-9 w-auto shrink-0 gap-2 rounded-md border-border bg-background px-3 font-normal shadow-none hover:bg-muted/50",
                filters.status !== "all" && "border-foreground/20 bg-muted/40"
              )}
            >
              <CircleDot className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-sm">{statusLabel}</span>
            </SelectTrigger>
            <SelectContent align="start" className="min-w-[11rem]">
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        option.dotClass
                      )}
                      aria-hidden
                    />
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 gap-1 text-muted-foreground"
              onClick={() => onFiltersChange(emptyFilters())}
            >
              <X className="size-3.5" />
              <span className="sr-only">Clear filters</span>
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            onClick={onExportCsv}
          >
            <Download className="size-3.5" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3.5" />
            Import
          </Button>
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
          <Button
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            onClick={onLogTrade}
          >
            <Plus className="size-3.5" />
            Log trade
          </Button>

          <div className="ml-auto shrink-0 pl-1">
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
        </div>
      </div>
    </div>
  );
}
