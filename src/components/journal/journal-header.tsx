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
import type { JournalFilters } from "@/lib/journal-types";
import { useIsMobile } from "@/hooks/use-media-query";
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
  const isMobile = useIsMobile();

  const patch = (partial: Partial<JournalFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const dateLabel =
    filters.dateFrom || filters.dateTo
      ? `${filters.dateFrom ? format(filters.dateFrom, "MMM d") : "…"} – ${
          filters.dateTo ? format(filters.dateTo, "MMM d, yyyy") : "…"
        }`
      : "Date range";

  const statusLabel =
    filters.status === "all" ? "Status" : statusFilterLabel(filters.status);

  const hasActiveFilters =
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.outcome !== "all" ||
    filters.status !== "all";

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Execution log"
        overlineEyebrow={false}
        title="Trade journal"
      />

      <div className="rounded-lg border border-border bg-card shadow-none">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
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
              className="hidden h-8 sm:block"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 border-border bg-background font-normal"
                    />
                  }
                >
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-sm">{dateLabel}</span>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto max-w-[calc(100vw-2rem)] p-0"
                  align="start"
                >
                  <Calendar
                    mode="range"
                    numberOfMonths={isMobile ? 1 : 2}
                    selected={{
                      from: filters.dateFrom,
                      to: filters.dateTo,
                    }}
                    onSelect={(range) => {
                      patch({
                        dateFrom: range?.from,
                        dateTo: range?.to,
                      });
                    }}
                  />
                  <div className="flex justify-end border-t border-border p-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        patch({ dateFrom: undefined, dateTo: undefined });
                        setDateOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Select
                value={filters.status}
                onValueChange={(v) => v && patch({ status: v })}
              >
                <SelectTrigger
                  className={cn(
                    "h-9 w-auto min-w-0 gap-2 rounded-md border-border bg-background px-3 font-normal shadow-none hover:bg-muted/50",
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
                  className="h-9 gap-1 text-muted-foreground"
                  onClick={() =>
                    onFiltersChange({
                      search: "",
                      dateFrom: undefined,
                      dateTo: undefined,
                      assetClass: "all",
                      direction: "all",
                      outcome: "all",
                      status: "all",
                      strategy: "all",
                    })
                  }
                >
                  <X className="size-3.5" />
                  Clear filters
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
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
