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
import { Separator } from "@/components/ui/separator";
import { AppPageHeader } from "@/components/app-page-header";
import type { AnalyticsTimeframe } from "@/lib/analytics";
import { emptyFilters, type JournalFilters } from "@/lib/journal-types";
import { useIsCompactApp } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { MOBILE_NAV_OFFSET_CLASS } from "@/lib/app-shell";

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
      <AppPageHeader
        eyebrow="Execution log"
        overlineEyebrow={false}
        title="Trade journal"
      />

      <div
        className={cn(
          "min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-none",
          MOBILE_NAV_OFFSET_CLASS
        )}
      >
        <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative w-full min-w-0 xl:max-w-sm xl:shrink-0">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.search}
                  onChange={(e) => patch({ search: e.target.value })}
                  placeholder="Search ticker, notes, tags…"
                  className="h-9 border-border bg-background pl-9"
                />
              </div>
              <Separator
                orientation="vertical"
                className="hidden h-8 xl:block"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-2">
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Select
                    value={filters.status}
                    onValueChange={(v) => v && patch({ status: v })}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-9 w-full min-w-[9.5rem] gap-2 rounded-md border-border bg-background px-3 font-normal shadow-none hover:bg-muted/50 sm:w-auto",
                        filters.status !== "all" &&
                          "border-foreground/20 bg-muted/40"
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
                      <span className="sr-only sm:not-sr-only">Clear filters</span>
                    </Button>
                  ) : null}
                </div>

                <div className="relative z-20 min-w-0 w-full flex-1 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TimeframeSegmentedControl
                    value={filters.timeframe}
                    onChange={(timeframe: AnalyticsTimeframe) =>
                      patch({ timeframe })
                    }
                    trailing={datePicker}
                    className="max-md:w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end xl:pt-0.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full gap-1.5 sm:w-auto"
              onClick={onExportCsv}
            >
              <Download className="size-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full gap-1.5 sm:w-auto"
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
              className="col-span-2 h-9 w-full gap-1.5 sm:col-span-1 sm:w-auto"
              onClick={onLogTrade}
            >
              <Plus className="size-3.5" />
              Log trade
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
