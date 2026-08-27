"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import { TradeDetailDrawer } from "@/components/journal/trade-detail-drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatPercent, tradeRMultiple } from "@/lib/analytics";
import {
  formatHoldTime,
  formatSignedMoney,
  type JournalTrade,
} from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const headClass =
  "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const numericHeadClass = cn(headClass, "text-right");
const cellClass = "px-3 py-2.5 text-xs";
const numericCellClass = cn(cellClass, "text-right", NUMERIC_CLASS);

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

export function BreakdownGroupTradesSheet({
  open,
  onOpenChange,
  groupName,
  groupType,
  trades,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string | null;
  groupType: "sector" | "marketCap";
  trades: JournalTrade[];
  currency: CurrencyCode;
}) {
  const [selectedTrade, setSelectedTrade] = useState<JournalTrade | null>(null);

  const sortedTrades = useMemo(
    () =>
      [...trades].sort(
        (a, b) =>
          new Date(b.exitDate || b.entryDate).getTime() -
          new Date(a.exitDate || a.entryDate).getTime()
      ),
    [trades]
  );

  const netPnl = useMemo(
    () => sortedTrades.reduce((sum, trade) => sum + trade.pnl, 0),
    [sortedTrades]
  );

  const winRate = useMemo(() => {
    if (sortedTrades.length === 0) return 0;
    const wins = sortedTrades.filter((trade) => trade.pnl > 0).length;
    return (wins / sortedTrades.length) * 100;
  }, [sortedTrades]);

  const groupLabel = groupType === "sector" ? "sector" : "market cap bucket";

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) setSelectedTrade(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col border-border bg-background p-0 sm:max-w-xl"
        >
          <SheetHeader className="space-y-3 border-b border-border/70 px-5 py-4 text-left">
            <SheetTitle className="text-lg">{groupName ?? "Trades"}</SheetTitle>
            <SheetDescription>
              All trades in this {groupLabel} for the selected period.
            </SheetDescription>
            {groupName ? (
              <dl className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Trades
                  </dt>
                  <dd className={cn("mt-0.5 font-semibold tabular-nums", NUMERIC_CLASS)}>
                    {sortedTrades.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Win rate
                  </dt>
                  <dd className={cn("mt-0.5 font-semibold tabular-nums", NUMERIC_CLASS)}>
                    {formatPercent(winRate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Net P&L
                  </dt>
                  <dd
                    className={cn(
                      "mt-0.5 font-semibold tabular-nums",
                      NUMERIC_CLASS,
                      pnlClass(netPnl)
                    )}
                  >
                    {formatMoney(netPnl, true, currency)}
                  </dd>
                </div>
              </dl>
            ) : null}
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1">
            {sortedTrades.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No trades found for this {groupLabel}.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70 hover:bg-transparent">
                    <TableHead className={headClass}>Date</TableHead>
                    <TableHead className={headClass}>Ticker</TableHead>
                    <TableHead className={numericHeadClass}>P&L</TableHead>
                    <TableHead className={cn(numericHeadClass, "hidden sm:table-cell")}>
                      R
                    </TableHead>
                    <TableHead className={cn(numericHeadClass, "hidden md:table-cell")}>
                      Hold
                    </TableHead>
                    <TableHead className={cn(headClass, "w-8")} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTrades.map((trade) => {
                    const rMultiple = tradeRMultiple(trade);
                    return (
                      <TableRow
                        key={trade.id}
                        className="cursor-pointer border-border/60 hover:bg-muted/20"
                        onClick={() => setSelectedTrade(trade)}
                      >
                        <TableCell className={cn(cellClass, "text-muted-foreground")}>
                          {tradeDate(trade)}
                        </TableCell>
                        <TableCell className={cellClass}>
                          <p className="font-semibold text-foreground">{trade.ticker}</p>
                          <p className="max-w-[8rem] truncate text-[11px] text-muted-foreground">
                            {trade.strategy || trade.direction}
                          </p>
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
                            "hidden text-muted-foreground sm:table-cell"
                          )}
                        >
                          {rMultiple === null ? "—" : `${rMultiple.toFixed(2)}R`}
                        </TableCell>
                        <TableCell
                          className={cn(
                            numericCellClass,
                            "hidden text-muted-foreground md:table-cell"
                          )}
                        >
                          {formatHoldTime(trade.holdTimeHours)}
                        </TableCell>
                        <TableCell className={cn(cellClass, "text-muted-foreground")}>
                          <ChevronRight className="size-4" aria-hidden />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <TradeDetailDrawer
        trade={selectedTrade}
        open={selectedTrade != null}
        onOpenChange={(next) => {
          if (!next) setSelectedTrade(null);
        }}
      />
    </>
  );
}
