"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tradeRMultiple } from "@/lib/analytics";
import { formatHoldTime, formatSignedMoney } from "@/lib/journal-types";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const LIMIT = 6;

const headClass =
  "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const numericHeadClass = cn(headClass, "text-right");
const cellClass = "px-3 py-2.5 text-xs";
const numericCellClass = cn(cellClass, "text-right", NUMERIC_CLASS);

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tradeDate(trade: JournalTrade) {
  try {
    return format(parseISO(trade.exitDate || trade.entryDate), "MMM d, yyyy");
  } catch {
    return trade.entryDate.slice(0, 10);
  }
}

function pnlClass(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}

/** Direction is a position type, not an outcome, so it stays uncolored. */
function DirectionChip({ direction }: { direction: JournalTrade["direction"] }) {
  const Icon = direction === "Long" ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
      <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      {direction}
    </span>
  );
}

export function RecentTradesCard({
  trades,
  currency = DEFAULT_CURRENCY,
}: {
  trades: JournalTrade[];
  currency?: CurrencyCode;
}) {
  const recent = [...trades]
    .sort(
      (a, b) =>
        new Date(b.exitDate || b.entryDate).getTime() -
        new Date(a.exitDate || a.entryDate).getTime()
    )
    .slice(0, LIMIT);

  return (
    <DataPanel
      title="Recent trades"
      subtitle="Most recently closed positions in the selected period"
      action={
        <Link
          href="/journal"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60"
        >
          Open journal
          <ArrowRight className="size-3" />
        </Link>
      }
      flush={recent.length > 0}
      footer={
        recent.length > 0
          ? `Showing the ${recent.length} newest of ${trades.length} closed trade${trades.length === 1 ? "" : "s"}.`
          : undefined
      }
    >
      {recent.length === 0 ? (
        <PanelEmpty
          title="No closed trades in this period"
          hint="Close a trade in the journal, or widen the timeframe, to see it here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <TableHead className={headClass}>Closed</TableHead>
              <TableHead className={headClass}>Instrument</TableHead>
              <TableHead className={headClass}>Direction</TableHead>
              <TableHead className={numericHeadClass}>Entry → Exit</TableHead>
              <TableHead className={cn(numericHeadClass, "hidden lg:table-cell")}>
                R:R
              </TableHead>
              <TableHead className={numericHeadClass}>R multiple</TableHead>
              <TableHead className={numericHeadClass}>P&L</TableHead>
              <TableHead className={cn(numericHeadClass, "hidden md:table-cell")}>
                Hold
              </TableHead>
              <TableHead
                className={cn(headClass, "hidden w-10 text-center sm:table-cell")}
              >
                Notes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((trade) => {
              const rMultiple = tradeRMultiple(trade);
              const notes = trade.notes?.trim();

              return (
                <TableRow key={trade.id} className="border-border/60">
                  <TableCell
                    className={cn(cellClass, "text-muted-foreground")}
                  >
                    {tradeDate(trade)}
                  </TableCell>
                  <TableCell className={cellClass}>
                    <p className="font-semibold text-foreground">
                      {trade.ticker}
                    </p>
                    <p className="max-w-[9rem] truncate text-[11px] text-muted-foreground">
                      {trade.strategy || "No setup recorded"}
                    </p>
                  </TableCell>
                  <TableCell className={cellClass}>
                    <DirectionChip direction={trade.direction} />
                  </TableCell>
                  <TableCell
                    className={cn(numericCellClass, "text-muted-foreground")}
                  >
                    {formatPrice(trade.entryPrice)}
                    <span className="mx-1 text-muted-foreground/60">→</span>
                    {formatPrice(trade.exitPrice)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      numericCellClass,
                      "hidden text-muted-foreground lg:table-cell"
                    )}
                  >
                    {trade.riskReward || "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      numericCellClass,
                      rMultiple === null
                        ? "text-muted-foreground"
                        : pnlClass(rMultiple)
                    )}
                  >
                    {rMultiple === null ? "—" : `${rMultiple.toFixed(2)}R`}
                  </TableCell>
                  <TableCell
                    className={cn(
                      numericCellClass,
                      "font-semibold",
                      pnlClass(trade.pnl)
                    )}
                  >
                    {formatSignedMoney(trade.pnl, currency)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      numericCellClass,
                      "hidden text-muted-foreground md:table-cell"
                    )}
                  >
                    {formatHoldTime(trade.holdTimeHours)}
                  </TableCell>
                  <TableCell
                    className={cn(cellClass, "hidden text-center sm:table-cell")}
                  >
                    {notes ? (
                      <span title={notes} className="inline-flex">
                        <FileText
                          className="size-3.5 text-muted-foreground"
                          aria-label="Has notes"
                        />
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
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
