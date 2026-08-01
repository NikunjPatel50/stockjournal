"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSignedMoney, type JournalTrade } from "@/lib/journal-types";
import {
  cn,
  NUMERIC_CLASS,
  tradeBadgeNegative,
  tradeBadgeNeutral,
  tradeBadgePositive,
} from "@/lib/utils";

function formatPnl(value: number) {
  return formatSignedMoney(value);
}

function formatTradeDate(trade: JournalTrade) {
  try {
    return format(parseISO(trade.exitDate || trade.entryDate), "yyyy-MM-dd");
  } catch {
    return trade.entryDate.slice(0, 10);
  }
}

export function TradeTable({ trades }: { trades: JournalTrade[] }) {
  const recent = [...trades]
    .sort(
      (a, b) =>
        new Date(b.exitDate || b.entryDate).getTime() -
        new Date(a.exitDate || a.entryDate).getTime()
    )
    .slice(0, 10);

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b border-border pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Recent trades</CardTitle>
          <CardDescription className="mt-1">
            Latest journal entries · open journal for full log
          </CardDescription>
        </div>
        <Link
          href="/journal"
          className={cn(buttonVariants({ size: "sm" }), "h-9 gap-1.5 shrink-0")}
        >
          <Plus className="size-4" />
          Log trade
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">
                  Ticker
                </TableHead>
                <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">
                  Outcome
                </TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-medium text-muted-foreground">
                  P&L
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 px-4 text-center text-muted-foreground"
                  >
                    No trades yet. Log your first trade in the Journal.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((trade) => (
                  <TableRow key={trade.id} className="hover:bg-muted/40">
                    <TableCell className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {formatTradeDate(trade)}
                    </TableCell>
                    <TableCell className="px-4 py-2.5 font-mono font-medium">
                      {trade.ticker}
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={
                          trade.outcome === "Win"
                            ? tradeBadgePositive
                            : trade.outcome === "Loss"
                              ? tradeBadgeNegative
                              : tradeBadgeNeutral
                        }
                      >
                        {trade.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-4 py-2.5 text-right font-medium",
                        NUMERIC_CLASS,
                        trade.pnl >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-700 dark:text-rose-400"
                      )}
                    >
                      {formatPnl(trade.pnl)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
