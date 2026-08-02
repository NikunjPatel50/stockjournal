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
  computeDurationBuckets,
  formatMoney,
  formatSignedPercent,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type HoldTimeBreakdownProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

const headClass =
  "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const numericHeadClass = cn(headClass, "text-right");
const cellClass = "px-3 py-2.5 text-xs";
const numericCellClass = cn(cellClass, "text-right", NUMERIC_CLASS);

export function HoldTimeBreakdown({
  trades,
  currency,
}: HoldTimeBreakdownProps) {
  const buckets = useMemo(() => computeDurationBuckets(trades), [trades]);
  const totalTrades = buckets.reduce((s, b) => s + b.trades, 0);
  const best = useMemo(
    () =>
      [...buckets]
        .filter((b) => b.trades > 0)
        .sort((a, b) => b.totalPnl - a.totalPnl)[0] ?? null,
    [buckets]
  );

  return (
    <DataPanel
      title="Hold-time profile"
      subtitle="How position duration maps to realized outcomes"
      meta={`${totalTrades} trade${totalTrades === 1 ? "" : "s"}`}
      flush
      footer={
        best
          ? `Most profitable duration: ${best.bucket} at ${formatMoney(best.totalPnl, true, currency)}.`
          : undefined
      }
    >
      {totalTrades === 0 ? (
        <div className="p-4 sm:p-5">
          <PanelEmpty
            title="No hold-time data"
            hint="Closed trades with entry and exit timestamps populate this profile."
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <TableHead className={headClass}>Duration</TableHead>
              <TableHead className={numericHeadClass}>Trades</TableHead>
              <TableHead className={numericHeadClass}>Share</TableHead>
              <TableHead className={numericHeadClass}>Avg ROI</TableHead>
              <TableHead className={numericHeadClass}>Net P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.map((bucket) => {
              const share = totalTrades
                ? (bucket.trades / totalTrades) * 100
                : 0;
              const inactive = bucket.trades === 0;

              return (
                <TableRow
                  key={bucket.bucket}
                  className={cn("border-border/60", inactive && "opacity-55")}
                >
                  <TableCell className={cn(cellClass, "font-medium")}>
                    {bucket.bucket}
                  </TableCell>
                  <TableCell className={numericCellClass}>
                    {bucket.trades}
                  </TableCell>
                  <TableCell className={cn(cellClass, "align-middle")}>
                    <div className="flex items-center justify-end gap-2.5">
                      <span
                        className="hidden h-1 w-14 overflow-hidden rounded-full bg-muted sm:block"
                        aria-hidden
                      >
                        <span
                          className="block h-full rounded-full bg-foreground/40"
                          style={{ width: `${share}%` }}
                        />
                      </span>
                      <span
                        className={cn(
                          "text-muted-foreground",
                          NUMERIC_CLASS
                        )}
                      >
                        {share.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      numericCellClass,
                      bucket.avgReturn > 0 &&
                        "text-emerald-600 dark:text-emerald-400",
                      bucket.avgReturn < 0 && "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {inactive ? "—" : formatSignedPercent(bucket.avgReturn)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      numericCellClass,
                      "font-semibold",
                      bucket.totalPnl > 0 &&
                        "text-emerald-600 dark:text-emerald-400",
                      bucket.totalPnl < 0 && "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {inactive
                      ? "—"
                      : formatMoney(bucket.totalPnl, true, currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </DataPanel>
  );
}
