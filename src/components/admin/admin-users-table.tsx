"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
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
import type { AdminUserRow } from "@/lib/admin-data";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type SortKey =
  | "fullName"
  | "currency"
  | "tradeCount"
  | "goalCount"
  | "createdAt"
  | "lastTradeSync";

const headClass =
  "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const cellClass = "px-3 py-2.5 text-xs";
const numericCellClass = cn(cellClass, "text-right", NUMERIC_CLASS);

/** Green within a week, amber within a month, muted beyond that. */
function freshnessClass(lastSync: string | null): string {
  if (!lastSync) return "bg-muted-foreground/40";
  const ageDays = (Date.now() - new Date(lastSync).getTime()) / 86_400_000;
  if (ageDays <= 7) return "bg-emerald-500";
  if (ageDays <= 30) return "bg-amber-500";
  return "bg-muted-foreground/40";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function compare(a: AdminUserRow, b: AdminUserRow, key: SortKey): number {
  const left = a[key];
  const right = b[key];
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left ?? "").localeCompare(String(right ?? ""));
}

export function AdminUsersTable({ rows }: { rows: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastTradeSync");
  const [ascending, setAscending] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) =>
          [row.fullName, row.email ?? "", row.userId, row.currency]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        )
      : rows;

    return [...filtered].sort((a, b) => {
      const result = compare(a, b, sortKey);
      return ascending ? result : -result;
    });
  }, [rows, query, sortKey, ascending]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setAscending((value) => !value);
      return;
    }
    setSortKey(key);
    setAscending(false);
  }

  function SortableHead({
    label,
    sortBy,
    align = "left",
  }: {
    label: string;
    sortBy: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === sortBy;
    const Icon = ascending ? ArrowUp : ArrowDown;

    return (
      <TableHead
        className={cn(headClass, align === "right" && "text-right")}
        aria-sort={
          active ? (ascending ? "ascending" : "descending") : undefined
        }
      >
        <button
          type="button"
          onClick={() => toggleSort(sortBy)}
          className={cn(
            "inline-flex items-center gap-1 uppercase tracking-[0.1em] transition-colors hover:text-foreground",
            active && "text-foreground",
            align === "right" && "flex-row-reverse"
          )}
        >
          {label}
          <Icon
            className={cn("size-3 transition-opacity", !active && "opacity-0")}
            aria-hidden
          />
        </button>
      </TableHead>
    );
  }

  return (
    <DataPanel
      title="User explorer"
      subtitle="Every account with cloud-synced settings"
      action={
        <div className="relative w-44 shrink-0 sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, ID"
            aria-label="Search users"
            className="h-8 pl-8 text-xs"
          />
        </div>
      }
      flush={visible.length > 0}
      footer={
        rows.length > 0
          ? `${visible.length} of ${rows.length} account${rows.length === 1 ? "" : "s"} shown. A green marker means the journal synced within the last 7 days.`
          : undefined
      }
    >
      {rows.length === 0 ? (
        <PanelEmpty
          title="No cloud accounts yet"
          hint="Users appear here after they sync a journal or goals to the cloud."
        />
      ) : visible.length === 0 ? (
        <PanelEmpty
          title="No matching users"
          hint={`Nothing matched "${query.trim()}". Try a different name, email, or ID.`}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <SortableHead label="User" sortBy="fullName" />
              <SortableHead label="Currency" sortBy="currency" align="right" />
              <SortableHead label="Trades" sortBy="tradeCount" align="right" />
              <SortableHead label="Goals" sortBy="goalCount" align="right" />
              <SortableHead label="Joined" sortBy="createdAt" align="right" />
              <SortableHead
                label="Last sync"
                sortBy="lastTradeSync"
                align="right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.userId} className="border-border/60">
                <TableCell className={cellClass}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-[10px] font-semibold text-muted-foreground">
                      {initials(row.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {row.fullName}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.email ?? (
                          <span className="font-mono">
                            {row.userId.slice(0, 8)}…
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell
                  className={cn(numericCellClass, "text-muted-foreground")}
                >
                  {row.currency}
                </TableCell>
                <TableCell className={cn(numericCellClass, "font-semibold")}>
                  {row.tradeCount}
                </TableCell>
                <TableCell
                  className={cn(numericCellClass, "text-muted-foreground")}
                >
                  {row.goalCount}
                </TableCell>
                <TableCell
                  className={cn(numericCellClass, "text-muted-foreground")}
                >
                  {format(new Date(row.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className={cn(cellClass, "text-right")}>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        freshnessClass(row.lastTradeSync)
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn("text-muted-foreground", NUMERIC_CLASS)}
                      title={
                        row.lastTradeSync
                          ? format(
                              new Date(row.lastTradeSync),
                              "MMM d, yyyy · h:mm a"
                            )
                          : undefined
                      }
                    >
                      {row.lastTradeSync
                        ? formatDistanceToNowStrict(
                            new Date(row.lastTradeSync),
                            { addSuffix: true }
                          )
                        : "never"}
                    </span>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataPanel>
  );
}
