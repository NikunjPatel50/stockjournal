"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  formatMoney,
  formatPf,
  type StrategyMetric,
} from "@/lib/analytics";
import { formatHoldTime } from "@/lib/journal-types";
import { NUMERIC_CLASS, cn } from "@/lib/utils";

interface StrategyTableProps {
  strategies: StrategyMetric[];
}

type SortKey =
  | "strategy"
  | "trades"
  | "winRate"
  | "totalPnl"
  | "profitFactor"
  | "avgDurationHours"
  | "maxDrawdown";

export function StrategyTable({ strategies }: StrategyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalPnl");
  const [desc, setDesc] = useState(true);

  const rows = useMemo(() => {
    const sorted = [...strategies].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return desc ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      const an = Number(av);
      const bn = Number(bv);
      return desc ? bn - an : an - bn;
    });
    return sorted;
  }, [strategies, sortKey, desc]);

  function toggle(key: SortKey) {
    if (sortKey === key) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(true);
    }
  }

  function SortHead({
    label,
    id,
    className,
  }: {
    label: string;
    id: SortKey;
    className?: string;
  }) {
    return (
      <TableHead className={className}>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => toggle(id)}
        >
          {label}
          <ArrowUpDown className="ml-1 size-3.5" />
        </Button>
      </TableHead>
    );
  }

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base font-semibold">
          Strategy performance
        </CardTitle>
        <CardDescription className="mt-1">
          Sortable summary by playbook setup
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                <SortHead label="Strategy" id="strategy" />
                <SortHead label="Trades" id="trades" />
                <SortHead label="Win Rate" id="winRate" />
                <SortHead label="Total P&L" id="totalPnl" />
                <SortHead label="Profit Factor" id="profitFactor" />
                <SortHead label="Avg Duration" id="avgDurationHours" />
                <SortHead label="Max DD" id="maxDrawdown" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No strategies in this selection
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.strategy} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{row.strategy}</TableCell>
                    <TableCell className={NUMERIC_CLASS}>{row.trades}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm", NUMERIC_CLASS)}>
                          {row.winRate.toFixed(1)}%
                        </span>
                        <Badge
                          className={
                            row.winRate >= 55
                              ? "bg-emerald-500/10 text-emerald-500"
                              : row.winRate < 45
                                ? "bg-rose-500/10 text-rose-500"
                                : "bg-slate-500/10 text-slate-400"
                          }
                        >
                          {row.wins}W
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-semibold",
                        NUMERIC_CLASS,
                        row.totalPnl >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      )}
                    >
                      {formatMoney(row.totalPnl)}
                    </TableCell>
                    <TableCell className={cn(NUMERIC_CLASS, "text-indigo-400")}>
                      {formatPf(row.profitFactor)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatHoldTime(row.avgDurationHours)}
                    </TableCell>
                    <TableCell className={cn(NUMERIC_CLASS, "text-rose-500")}>
                      {formatMoney(row.maxDrawdown)}
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
