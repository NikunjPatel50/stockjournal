"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZES = ["10", "20", "30", "50"] as const;

function listToken<T>(rows: T[], getId: (row: T) => string) {
  let hash = rows.length;
  for (const row of rows) {
    const id = getId(row);
    for (let index = 0; index < id.length; index += 1) {
      hash = (Math.imul(hash, 33) + id.charCodeAt(index)) | 0;
    }
  }
  return hash;
}

export function useScreenerPage<T>(rows: T[], getId: (row: T) => string) {
  const token = listToken(rows, getId);
  const [pageToken, setPageToken] = useState(token);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [showAll, setShowAll] = useState(false);

  const total = rows.length;
  const size = showAll ? Math.max(total, 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(total / size));

  let safeIndex = Math.min(pageIndex, pageCount - 1);
  if (pageToken !== token) {
    safeIndex = 0;
    setPageToken(token);
    setPageIndex(0);
  } else if (pageIndex > pageCount - 1) {
    setPageIndex(safeIndex);
  }
  const start = safeIndex * size;

  return {
    pageRows: rows.slice(start, start + size),
    pageIndex: safeIndex,
    pageCount,
    total,
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + size, total),
    rowsValue: showAll ? "all" : String(pageSize),
    canPrevious: safeIndex > 0,
    canNext: safeIndex + 1 < pageCount,
    previous() {
      setPageIndex((index) => Math.max(0, index - 1));
    },
    next() {
      setPageIndex((index) => index + 1);
    },
    setRowsValue(value: string | null) {
      if (value == null || value === "") return;
      if (value === "all") {
        setShowAll(true);
        setPageIndex(0);
        return;
      }
      const nextSize = Number(value);
      if (!Number.isFinite(nextSize) || nextSize < 1) return;
      setShowAll(false);
      setPageSize(nextSize);
      setPageIndex(0);
    },
  };
}

export function ScreenerTablePagination({
  page,
  noun = "rows",
}: {
  page: {
    total: number;
    rangeStart: number;
    rangeEnd: number;
    pageIndex: number;
    pageCount: number;
    rowsValue: string;
    canPrevious: boolean;
    canNext: boolean;
    previous: () => void;
    next: () => void;
    setRowsValue: (value: string | null) => void;
  };
  noun?: string;
}) {
  if (page.total === 0) return null;

  const label = page.total === 1 ? noun.replace(/s$/, "") : noun;

  return (
    <div className="flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">
          {page.rangeStart}–{page.rangeEnd}
        </span>
        <span className="mx-1.5 text-border/80">·</span>
        {page.total} {label}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/70 p-0.5">
          <span className="hidden pl-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:inline">
            Rows
          </span>
          <Select value={page.rowsValue} onValueChange={page.setRowsValue}>
            <SelectTrigger className="h-7 min-w-[3.75rem] border-0 bg-transparent text-xs font-medium shadow-none hover:bg-background/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All</SelectItem>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center rounded-md border border-border/60 bg-background/70 p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-md disabled:opacity-35"
            disabled={!page.canPrevious}
            onClick={page.previous}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-[3.75rem] px-1 text-center text-[11px] font-medium tabular-nums text-foreground">
            {page.pageIndex + 1}
            <span className="text-muted-foreground"> / {page.pageCount}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-md disabled:opacity-35"
            disabled={!page.canNext}
            onClick={page.next}
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
