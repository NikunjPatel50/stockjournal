"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScreenerChange } from "@/components/screener/screener-change";
import { ScreenerChartButton } from "@/components/screener/screener-chart-button";
import {
  ScreenerStrength,
  ScreenerWhy,
} from "@/components/screener/screener-strength";
import type { ScreenerSort, ScreenerSortKey } from "@/lib/screener/sort";
import {
  SCREENER_PERIODS,
  SCREENER_PERIOD_LABELS,
  type PeriodChanges,
} from "@/lib/screener/types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const headClass =
  "h-9 bg-muted/30 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export type PeriodTableRow = {
  id: string;
  label: string;
  subtitle?: string;
  trailing?: ReactNode;
  changes: PeriodChanges;
  strength?: number | null;
  why?: string | null;
  muted?: boolean;
  chartSymbol?: string | null;
};

export function ScreenerPeriodTable({
  rows,
  sort,
  onSort,
  onRowClick,
  extraHead,
  renderExtra,
  stickyLabel = "Name",
  showChartButton = false,
}: {
  rows: PeriodTableRow[];
  sort: ScreenerSort;
  onSort: (key: ScreenerSortKey) => void;
  onRowClick?: (id: string) => void;
  extraHead?: ReactNode;
  renderExtra?: (row: PeriodTableRow) => ReactNode;
  stickyLabel?: string;
  showChartButton?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead
            className={cn(
              headClass,
              "sticky left-0 z-10 min-w-[9rem] bg-muted/80 backdrop-blur-sm"
            )}
          >
            {stickyLabel}
          </TableHead>
          {extraHead}
          {SCREENER_PERIODS.map((period) => (
            <TableHead key={period} className={cn(headClass, "text-right")}>
              <SortHeader
                label={SCREENER_PERIOD_LABELS[period]}
                active={sort.key === period}
                direction={sort.direction}
                onClick={() => onSort(period)}
              />
            </TableHead>
          ))}
          <TableHead className={cn(headClass, "text-right")}>
            <SortHeader
              label="Strength"
              active={sort.key === "strength"}
              direction={sort.direction}
              title="Momentum, trend direction, recent price action, and relative strength"
              onClick={() => onSort("strength")}
            />
          </TableHead>
          <TableHead className={cn(headClass, "min-w-[12rem]")}>Why</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className={cn(
              onRowClick && "cursor-pointer",
              row.muted && "bg-muted/20"
            )}
            onClick={onRowClick ? () => onRowClick(row.id) : undefined}
          >
            <TableCell
              className={cn(
                "sticky left-0 z-10 bg-card px-2.5 py-2.5",
                row.muted && "bg-muted/30"
              )}
            >
              <div className="flex min-w-0 items-start gap-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.label}
                  </p>
                  {row.subtitle ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {row.subtitle}
                    </p>
                  ) : null}
                </div>
                {showChartButton ? (
                  <ScreenerChartButton
                    ticker={row.chartSymbol ? undefined : row.id}
                    symbol={row.chartSymbol}
                    label={row.label}
                  />
                ) : null}
              </div>
            </TableCell>
            {renderExtra?.(row)}
            {SCREENER_PERIODS.map((period) => (
              <TableCell
                key={period}
                className={cn("px-2.5 py-2.5 text-right text-sm", NUMERIC_CLASS)}
              >
                <ScreenerChange value={row.changes[period]} />
              </TableCell>
            ))}
            <TableCell className="px-2.5 py-2.5 text-right">
              <ScreenerStrength score={row.strength} />
            </TableCell>
            <TableCell className="px-2.5 py-2.5">
              <ScreenerWhy why={row.why} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  direction: ScreenerSort["direction"];
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-label={`Sort by ${label} ${
        active && direction === "desc" ? "ascending" : "descending"
      }`}
      className={cn(
        "ml-auto inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 transition-colors",
        active ? "bg-primary/15 text-foreground" : "hover:text-foreground"
      )}
    >
      {label}
      {active ? (
        direction === "desc" ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronUp className="size-3" />
        )
      ) : (
        <span className="flex flex-col -space-y-1.5 text-muted-foreground/50">
          <ChevronUp className="size-2.5" />
          <ChevronDown className="size-2.5" />
        </span>
      )}
    </button>
  );
}
