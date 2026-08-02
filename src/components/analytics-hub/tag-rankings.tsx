"use client";

import { useMemo } from "react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  computeTagMetrics,
  formatMoney,
  formatPercent,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type TagRankingsProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

const MAX_ROWS = 8;

const headClass =
  "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const numericHeadClass = cn(headClass, "text-right");
const cellClass = "px-3 py-2.5 text-xs";
const numericCellClass = cn(cellClass, "text-right", NUMERIC_CLASS);

export function TagRankings({ trades, currency }: TagRankingsProps) {
  const tags = useMemo(() => computeTagMetrics(trades), [trades]);
  const rows = tags.slice(0, MAX_ROWS);

  return (
    <DataPanel
      title="Tag attribution"
      subtitle="Which labels correlate with your best and worst outcomes"
      meta={`${tags.length} tag${tags.length === 1 ? "" : "s"}`}
      flush
      footer={
        tags.length > MAX_ROWS
          ? `Showing the ${MAX_ROWS} highest-contributing tags of ${tags.length}.`
          : undefined
      }
    >
      {rows.length === 0 ? (
        <div className="p-4 sm:p-5">
          <PanelEmpty
            title="No tags recorded"
            hint="Add tags to trades to compare outcomes across setups and conditions."
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <TableHead className={headClass}>Tag</TableHead>
              <TableHead className={numericHeadClass}>Trades</TableHead>
              <TableHead className={numericHeadClass}>Win rate</TableHead>
              <TableHead className={numericHeadClass}>Avg R</TableHead>
              <TableHead className={numericHeadClass}>Net P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.tag} className="border-border/60">
                <TableCell
                  className={cn(cellClass, "max-w-[12rem] truncate font-medium")}
                >
                  {row.tag}
                </TableCell>
                <TableCell className={numericCellClass}>{row.trades}</TableCell>
                <TableCell className={numericCellClass}>
                  {formatPercent(row.winRate)}
                </TableCell>
                <TableCell
                  className={cn(numericCellClass, "text-muted-foreground")}
                >
                  {row.avgR !== null ? `${row.avgR.toFixed(2)}R` : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    numericCellClass,
                    "font-semibold",
                    row.totalPnl > 0 && "text-emerald-600 dark:text-emerald-400",
                    row.totalPnl < 0 && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatMoney(row.totalPnl, true, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataPanel>
  );
}
