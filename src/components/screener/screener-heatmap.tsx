"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { ScreenerChange } from "@/components/screener/screener-change";
import { ScreenerChartButton } from "@/components/screener/screener-chart-button";
import {
  ScreenerStrength,
  ScreenerWhy,
} from "@/components/screener/screener-strength";
import { heatBackground } from "@/lib/screener/format";
import type { ScreenerSort, ScreenerSortKey } from "@/lib/screener/sort";
import {
  SCREENER_PERIODS,
  SCREENER_PERIOD_LABELS,
  type PeriodChanges,
} from "@/lib/screener/types";
import { cn } from "@/lib/utils";

type HeatRow = {
  id: string;
  label: string;
  changes: PeriodChanges;
  strength?: number | null;
  why?: string | null;
  chartSymbol?: string | null;
};

export function ScreenerHeatmap({
  rows,
  onRowClick,
  sort,
  onSort,
  showChartButton = false,
}: {
  rows: HeatRow[];
  onRowClick?: (id: string) => void;
  sort: ScreenerSort;
  onSort?: (key: ScreenerSortKey) => void;
  showChartButton?: boolean;
}) {
  const maxAbs = Math.max(
    0.01,
    ...rows.flatMap((row) =>
      SCREENER_PERIODS.map((period) => Math.abs(row.changes[period] ?? 0))
    )
  );

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[40rem] gap-px rounded-lg bg-border/60"
        style={{
          gridTemplateColumns: `minmax(7.5rem, 1.2fr) repeat(${SCREENER_PERIODS.length}, minmax(3.5rem, 1fr)) minmax(4.25rem, 0.85fr) minmax(10rem, 1.3fr)`,
        }}
      >
        <div className="bg-muted/40 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Name
        </div>
        {SCREENER_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onSort?.(period)}
            className={cn(
              "inline-flex items-center justify-center gap-0.5 bg-muted/40 px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
              sort.key === period && "text-foreground"
            )}
          >
            {SCREENER_PERIOD_LABELS[period]}
            {sort.key === period ? (
              sort.direction === "desc" ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronUp className="size-3" />
              )
            ) : null}
          </button>
        ))}
        <button
          type="button"
          title="Momentum, trend direction, recent price action, and relative strength"
          onClick={() => onSort?.("strength")}
          className={cn(
            "inline-flex items-center justify-center gap-0.5 bg-muted/40 px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
            sort.key === "strength" && "text-foreground"
          )}
        >
          Strength
          {sort.key === "strength" ? (
            sort.direction === "desc" ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronUp className="size-3" />
            )
          ) : null}
        </button>
        <div className="bg-muted/40 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Why
        </div>
        {rows.map((row, index) => (
          <HeatmapRow
            key={`${row.id}-${index}`}
            row={row}
            maxAbs={maxAbs}
            onClick={onRowClick ? () => onRowClick(row.id) : undefined}
            showChartButton={showChartButton}
          />
        ))}
      </div>
    </div>
  );
}

function HeatmapRow({
  row,
  maxAbs,
  onClick,
  showChartButton,
}: {
  row: HeatRow;
  maxAbs: number;
  onClick?: () => void;
  showChartButton?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-1 bg-card px-2.5 py-2">
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className="min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground disabled:cursor-default"
        >
          {row.label}
        </button>
        {showChartButton ? (
          <ScreenerChartButton
            ticker={row.chartSymbol ? undefined : row.id}
            symbol={row.chartSymbol}
            label={row.label}
          />
        ) : null}
      </div>
      {SCREENER_PERIODS.map((period) => (
        <div
          key={period}
          className="flex items-center justify-center bg-card px-1 py-2 text-[11px]"
          style={{ backgroundColor: heatBackground(row.changes[period], maxAbs) }}
        >
          <ScreenerChange value={row.changes[period]} />
        </div>
      ))}
      <div
        className="flex items-center justify-center bg-card px-1 py-2 text-[11px]"
        style={{
          backgroundColor: heatBackground(
            row.strength == null ? null : row.strength - 50,
            50
          ),
        }}
      >
        <ScreenerStrength score={row.strength} compact />
      </div>
      <div className="flex items-center bg-card px-2 py-2">
        <ScreenerWhy why={row.why} />
      </div>
    </>
  );
}
