"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { tradeRMultiple } from "@/lib/analytics";
import { formatSignedMoney } from "@/lib/journal-types";
import type { JournalTrade } from "@/lib/journal-types";
import {
  cn,
  NUMERIC_CLASS,
  tradeBadgeNegative,
  tradeBadgePositive,
} from "@/lib/utils";

const LIMIT = 6;

function formatPnl(value: number) {
  return formatSignedMoney(value);
}

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatHoldLabel(hours: number) {
  if (hours < 1) return "<1 hour";
  if (hours < 24) {
    const h = Math.round(hours);
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function tradeDate(trade: JournalTrade) {
  try {
    return format(parseISO(trade.exitDate || trade.entryDate), "MMM d, yyyy");
  } catch {
    return trade.entryDate.slice(0, 10);
  }
}

export function RecentTradesCard({ trades }: { trades: JournalTrade[] }) {
  const recent = [...trades]
    .sort(
      (a, b) =>
        new Date(b.exitDate || b.entryDate).getTime() -
        new Date(a.exitDate || a.entryDate).getTime()
    )
    .slice(0, LIMIT);

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="border-b border-border py-3 pb-3">
        <CardTitle className="text-base font-semibold">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-9 whitespace-nowrap px-3 text-xs font-medium text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  Ticker
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  Setup
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  Direction
                </TableHead>
                <TableHead className="h-9 whitespace-nowrap px-3 text-xs font-medium text-muted-foreground">
                  Entry / Exit
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  R:R
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">
                  P&L
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">
                  R Multiple
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  Hold Time
                </TableHead>
                <TableHead className="h-9 w-10 px-2 text-xs font-medium text-muted-foreground">
                  Notes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="h-24 px-3 text-center text-sm text-muted-foreground"
                  >
                    No trades in the selected range
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((trade) => {
                  const rMult = tradeRMultiple(trade);
                  return (
                    <TableRow key={trade.id} className="hover:bg-muted/40">
                      <TableCell className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {tradeDate(trade)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm font-semibold">
                        {trade.ticker}
                      </TableCell>
                      <TableCell className="max-w-[7rem] truncate px-3 py-2 text-xs text-muted-foreground">
                        {trade.strategy || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={
                            trade.direction === "Long"
                              ? tradeBadgePositive
                              : tradeBadgeNegative
                          }
                        >
                          {trade.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatPrice(trade.entryPrice)} /{" "}
                        {formatPrice(trade.exitPrice)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                        {trade.riskReward || "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-3 py-2 text-right text-xs font-medium",
                          NUMERIC_CLASS,
                          trade.pnl >= 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        )}
                      >
                        {formatPnl(trade.pnl)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-3 py-2 text-right text-xs font-medium",
                          NUMERIC_CLASS,
                          rMult === null
                            ? "text-muted-foreground"
                            : rMult >= 0
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                        )}
                      >
                        {rMult === null ? "—" : `${rMult.toFixed(2)}R`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {formatHoldLabel(trade.holdTimeHours)}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center">
                        {trade.notes?.trim() ? (
                          <span title={trade.notes}>
                            <FileText className="mx-auto size-4 text-muted-foreground" />
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border py-3 text-center">
          <Link
            href="/journal"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View All Trades
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
