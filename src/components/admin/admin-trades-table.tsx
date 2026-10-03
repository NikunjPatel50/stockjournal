"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminTradeRow } from "@/lib/admin-data";
import { formatCurrency } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const headClass =
  "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const cellClass = "px-3 py-2.5 text-xs";

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy");
}

export function AdminTradesTable({
  rows,
  initialUserId = "",
}: {
  rows: AdminTradeRow[];
  initialUserId?: string;
}) {
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState(initialUserId);
  const [status, setStatus] = useState<"all" | "Active" | "Closed">("all");

  const accounts = useMemo(() => {
    const seen = new Map<string, { name: string; email: string | null }>();
    for (const row of rows) {
      if (!seen.has(row.userId)) {
        seen.set(row.userId, { name: row.userName, email: row.email });
      }
    }
    return [...seen.entries()].sort((a, b) =>
      a[1].name.localeCompare(b[1].name)
    );
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (userId && row.userId !== userId) return false;
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      return [row.userName, row.email ?? "", row.ticker, row.strategy, row.assetClass]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, query, userId, status]);

  const statusCounts = useMemo(() => {
    const scoped = userId ? rows.filter((row) => row.userId === userId) : rows;
    return {
      all: scoped.length,
      Active: scoped.filter((row) => row.status === "Active").length,
      Closed: scoped.filter((row) => row.status === "Closed").length,
    };
  }, [rows, userId]);

  return (
    <DataPanel
      title="All trades"
      subtitle="Cloud journals for every account"
      action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            aria-label="Filter by account"
            className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
          >
            <option value="">All accounts</option>
            {accounts.map(([id, account]) => (
              <option key={id} value={id}>
                {account.name}
                {account.email ? ` · ${account.email}` : ""}
              </option>
            ))}
          </select>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ticker, user, strategy"
              aria-label="Search trades"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      }
      flush={rows.length > 0}
      footer={
        rows.length > 0
          ? `${visible.length} of ${rows.length} trade${rows.length === 1 ? "" : "s"} shown.`
          : undefined
      }
    >
      {rows.length === 0 ? (
        <PanelEmpty
          title="No trades stored yet"
          hint="Trades appear here after an account syncs its journal to the cloud."
        />
      ) : (
        <>
          <div
            role="group"
            aria-label="Filter by status"
            className="flex flex-wrap gap-1.5 border-b border-border/60 px-4 py-2.5 sm:px-5"
          >
            {(
              [
                ["all", "All"],
                ["Active", "Active"],
                ["Closed", "Closed"],
              ] as const
            ).map(([value, label]) => {
              const active = status === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatus(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "border-primary/30 bg-primary/15 text-primary"
                      : "border-border/70 bg-muted/25 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {label}
                  <span className="tabular-nums">{statusCounts[value]}</span>
                </button>
              );
            })}
          </div>
          {visible.length === 0 ? (
            <div className="p-4 sm:p-5">
              <PanelEmpty
                title="No matching trades"
                hint="Try another account, status, or search."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/70 hover:bg-transparent">
                  <TableHead className={headClass}>Account</TableHead>
                  <TableHead className={headClass}>Ticker</TableHead>
                  <TableHead className={headClass}>Side</TableHead>
                  <TableHead className={headClass}>Status</TableHead>
                  <TableHead className={cn(headClass, "text-right")}>
                    Entry
                  </TableHead>
                  <TableHead className={cn(headClass, "text-right")}>
                    Exit
                  </TableHead>
                  <TableHead className={cn(headClass, "text-right")}>
                    Qty
                  </TableHead>
                  <TableHead className={cn(headClass, "text-right")}>
                    P&L
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.key} className="border-border/60">
                    <TableCell className={cellClass}>
                      <p className="truncate font-medium text-foreground">
                        {row.userName}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.email ?? `${row.userId.slice(0, 8)}…`}
                      </p>
                    </TableCell>
                    <TableCell className={cellClass}>
                      <p className="font-semibold text-foreground">{row.ticker}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.assetClass}
                        {row.strategy ? ` · ${row.strategy}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className={cellClass}>{row.direction}</TableCell>
                    <TableCell className={cellClass}>
                      <p>{row.status}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.status === "Active" ? "Open" : row.outcome}
                      </p>
                    </TableCell>
                    <TableCell className={cn(cellClass, "text-right", NUMERIC_CLASS)}>
                      <p>{formatDay(row.entryDate)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.entryPrice.toLocaleString("en-IN")}
                      </p>
                    </TableCell>
                    <TableCell className={cn(cellClass, "text-right", NUMERIC_CLASS)}>
                      {row.status === "Active" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          <p>{formatDay(row.exitDate)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.exitPrice.toLocaleString("en-IN")}
                          </p>
                        </>
                      )}
                    </TableCell>
                    <TableCell className={cn(cellClass, "text-right", NUMERIC_CLASS)}>
                      {row.quantity.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell
                      className={cn(
                        cellClass,
                        "text-right font-semibold",
                        NUMERIC_CLASS,
                        row.pnl > 0 && "text-emerald-600 dark:text-emerald-400",
                        row.pnl < 0 && "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {formatCurrency(row.pnl, row.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </DataPanel>
  );
}
