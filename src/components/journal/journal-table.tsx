"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/components/settings/settings-provider";
import {
  displayTradeOutcome,
  formatCurrency,
  formatHoldTime,
  formatMarketPrice,
  formatSignedMoney,
  resolveTradeHoldHours,
  type JournalTrade,
} from "@/lib/journal-types";
import { useHoldTimeClock } from "@/hooks/use-hold-time-clock";
import { resolveTradePnlDisplay } from "@/lib/trade-pnl";
import {
  loadJournalColumnPrefs,
  saveJournalColumnPrefs,
  type JournalColumnPrefs,
} from "@/lib/journal-column-prefs";
import { JournalColumnsMenu } from "@/components/journal/journal-columns-menu";
import { useMarketQuotes, type ClientMarketQuote } from "@/hooks/use-market-quotes";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { CurrencyCode } from "@/lib/settings";
import {
  cn,
  NUMERIC_CLASS,
  tradeBadgeActive,
  tradeBadgeNegative,
  tradeBadgeNeutral,
  tradeBadgePositive,
} from "@/lib/utils";

const CELL_X = "px-3";

function journalCellClass(_columnId: string) {
  return cn(CELL_X, "py-3 align-middle text-center");
}

function journalHeaderClass(_columnId: string) {
  return cn(
    CELL_X,
    "h-10 border-r border-border/50 py-2 align-middle text-center last:border-r-0"
  );
}

function StaticHeader({ label }: { label: string }) {
  return (
    <span className="block text-xs font-medium tracking-tight text-muted-foreground">
      {label}
    </span>
  );
}

function SortHeader({
  label,
  sorted,
  onClick,
}: {
  label: string;
  sorted: false | "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs font-medium tracking-tight transition-colors",
        sorted
          ? "text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5 shrink-0 text-foreground" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5 shrink-0 text-foreground" />
      ) : (
        <ArrowUpDown className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-50" />
      )}
    </button>
  );
}

function outcomeBadgeClass(outcome: JournalTrade["outcome"]) {
  if (outcome === "Win") return tradeBadgePositive;
  if (outcome === "Loss") return tradeBadgeNegative;
  return "border-border bg-muted/50 text-foreground";
}

function rowAccentClass(trade: JournalTrade, livePnl?: number) {
  const pnl = livePnl ?? trade.pnl;
  if (pnl > 0) {
    return "border-l-emerald-500 bg-emerald-500/[0.07] hover:bg-emerald-500/[0.12] dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15";
  }
  if (pnl < 0) {
    return "border-l-rose-500 bg-rose-500/[0.07] hover:bg-rose-500/[0.12] dark:bg-rose-500/10 dark:hover:bg-rose-500/15";
  }
  if (trade.status === "Active") {
    return "border-l-emerald-500/80 bg-muted/20 hover:bg-muted/30";
  }
  return "border-l-border hover:bg-muted/25";
}

function TradePnlCell({
  trade,
  quote,
  displayCurrency,
}: {
  trade: JournalTrade;
  quote: ClientMarketQuote | null;
  displayCurrency: CurrencyCode;
}) {
  const { pnl, roi, isUnrealized, currency } = resolveTradePnlDisplay(
    trade,
    quote,
    displayCurrency
  );

  return (
    <div
      className={cn(
        "text-center",
        NUMERIC_CLASS,
        pnl >= 0
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-rose-700 dark:text-rose-400"
      )}
    >
      <p className="text-sm font-bold">
        {isUnrealized
          ? formatSignedMoney(pnl, currency)
          : formatCurrency(pnl)}
      </p>
      <p className="text-[11px] opacity-80">
        {roi >= 0 ? "+" : ""}
        {roi.toFixed(2)}%
        {isUnrealized ? (
          <span className="text-muted-foreground"> · unrealized</span>
        ) : null}
      </p>
    </div>
  );
}

function quoteDisplayCurrency(
  quote: ClientMarketQuote | null,
  fallback: CurrencyCode
): CurrencyCode {
  return quote?.currency ?? fallback;
}

function LivePrice({
  trade,
  quote,
  loading,
  currency,
}: {
  trade: JournalTrade;
  quote: ClientMarketQuote | null;
  loading: boolean;
  currency: CurrencyCode;
}) {
  const prevPriceRef = useRef<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const price = quote?.price;
    if (price == null || !Number.isFinite(price)) return;

    const prev = prevPriceRef.current;
    if (prev !== null && prev !== price) {
      setPriceFlash(price > prev ? "up" : "down");
      const id = window.setTimeout(() => setPriceFlash(null), 1000);
      prevPriceRef.current = price;
      return () => window.clearTimeout(id);
    }
    prevPriceRef.current = price;
  }, [quote?.price]);

  if (trade.assetClass === "Options") {
    return <span className="text-muted-foreground">—</span>;
  }

  if (!quote && loading) {
    return (
      <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted" />
    );
  }

  if (!quote?.price) {
    return <span className="text-muted-foreground">—</span>;
  }

  const displayCurrency = quoteDisplayCurrency(quote, currency);
  const change = quote.changePercent;
  const changeUp = change !== null && change > 0;
  const changeDown = change !== null && change < 0;
  const isLive =
    quote.isLive === true ||
    quote.changePercent !== null ||
    (quote.timestamp !== null && quote.timestamp > 0);

  return (
    <div className={cn("text-center", NUMERIC_CLASS)}>
      <p
        className={cn(
          "inline-flex items-center justify-center gap-0.5 font-semibold tabular-nums transition-colors duration-200",
          priceFlash === "up" && "text-emerald-600 dark:text-emerald-400",
          priceFlash === "down" && "text-rose-600 dark:text-rose-400",
          !priceFlash && "text-foreground"
        )}
      >
        {priceFlash === "up" ? (
          <ArrowUp className="size-3 shrink-0" aria-hidden />
        ) : priceFlash === "down" ? (
          <ArrowDown className="size-3 shrink-0" aria-hidden />
        ) : null}
        {formatMarketPrice(quote.price, displayCurrency)}
      </p>
      <div className="mt-0.5 flex items-center justify-center gap-1.5">
        {change !== null ? (
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              changeUp && "text-emerald-700 dark:text-emerald-400",
              changeDown && "text-rose-700 dark:text-rose-400",
              !changeUp && !changeDown && "text-muted-foreground"
            )}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        ) : null}
        {change !== null && isLive ? (
          <span className="text-[10px] text-muted-foreground/60" aria-hidden>
            ·
          </span>
        ) : null}
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        ) : change === null ? (
          <span className="text-[10px] text-muted-foreground">Last close</span>
        ) : null}
      </div>
    </div>
  );
}

function formatCompactPrice(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(2);
}

function EntryExitValue({
  entry,
  exit,
  isActive,
}: {
  entry: number;
  exit: number;
  isActive?: boolean;
}) {
  const exitPart =
    isActive || exit <= 0 ? "0" : formatCompactPrice(exit);
  return (
    <span className={cn("block text-center text-sm font-medium text-foreground", NUMERIC_CLASS)}>
      {formatCompactPrice(entry)}/{exitPart}
    </span>
  );
}

function TradeActions({
  trade,
  onEdit,
  onDuplicate,
  onDelete,
  className,
}: {
  trade: JournalTrade;
  onEdit: (t: JournalTrade) => void;
  onDuplicate: (t: JournalTrade) => void;
  onDelete: (ids: string[]) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-end gap-0.5", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Edit trade"
        aria-label="Edit trade"
        onClick={() => onEdit(trade)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Duplicate trade"
        aria-label="Duplicate trade"
        onClick={() => onDuplicate(trade)}
      >
        <Copy className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Delete trade"
        aria-label="Delete trade"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onDelete([trade.id])}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

interface JournalTableProps {
  trades: JournalTrade[];
  /** All trades before header filters (for empty-state copy). */
  totalTradeCount?: number;
  onEdit: (trade: JournalTrade) => void;
  onDuplicate: (trade: JournalTrade) => void;
  onDelete: (ids: string[]) => void;
}

export function JournalTable({
  trades,
  totalTradeCount,
  onEdit,
  onDuplicate,
  onDelete,
}: JournalTableProps) {
  const isCompact = useMediaQuery("(max-width: 1023px)");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "entryDate", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPrefs, setColumnPrefs] = useState<JournalColumnPrefs>(() =>
    loadJournalColumnPrefs()
  );

  const { settings } = useSettings();
  const displayCurrency = settings.profile.currency;

  const {
    getQuote,
    loading: quotesLoading,
    error: quotesError,
    delayed: quotesDelayed,
  } = useMarketQuotes(trades, displayCurrency);

  const holdNow = useHoldTimeClock(60_000);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [trades.length]);

  useEffect(() => {
    saveJournalColumnPrefs(columnPrefs);
  }, [columnPrefs]);

  const columnVisibility = useMemo(
    () => ({
      ...columnPrefs.visibility,
      actions: true,
    }),
    [columnPrefs.visibility]
  );

  const columns = useMemo<ColumnDef<JournalTrade>[]>(
    () => [
      {
        accessorKey: "entryDate",
        header: ({ column }) => (
          <SortHeader
            label="Date"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {format(new Date(row.original.entryDate), "MMM d")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(row.original.entryDate), "yyyy")}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "ticker",
        header: ({ column }) => (
          <SortHeader
            label="Symbol"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-center">
              <p className={cn("text-sm font-bold tracking-tight", NUMERIC_CLASS)}>
                {t.ticker}
              </p>
              {t.strategy ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t.strategy}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: () => <StaticHeader label="Status" />,
        cell: ({ row }) => {
          const status = row.original.status ?? "Closed";
          return (
            <div className="flex justify-center">
              <Badge
              variant="outline"
              className={cn(
                "font-medium",
                status === "Active" ? tradeBadgeActive : tradeBadgeNeutral
              )}
            >
              {status}
            </Badge>
            </div>
          );
        },
      },
      {
        id: "outcome",
        header: () => <StaticHeader label="Outcome" />,
        cell: ({ row }) => {
          const trade = row.original;
          const pending = (trade.status ?? "Closed") === "Active";
          const label = displayTradeOutcome(trade);
          return (
          <div className="flex justify-center">
          <Badge
            variant="outline"
            className={cn(
              "font-medium",
              pending
                ? "border-border bg-muted/40 text-muted-foreground"
                : outcomeBadgeClass(trade.outcome)
            )}
          >
            {label}
          </Badge>
          </div>
          );
        },
      },
      {
        id: "prices",
        header: () => <StaticHeader label="Entry / exit" />,
        cell: ({ row }) => (
          <EntryExitValue
            entry={row.original.entryPrice}
            exit={row.original.exitPrice}
            isActive={(row.original.status ?? "Closed") === "Active"}
          />
        ),
      },
      {
        id: "currentPrice",
        header: () => <StaticHeader label="Market" />,
        cell: ({ row }) => (
          <LivePrice
            trade={row.original}
            quote={getQuote(row.original)}
            loading={quotesLoading}
            currency={displayCurrency}
          />
        ),
      },
      {
        accessorKey: "quantity",
        header: () => <StaticHeader label="Qty" />,
        cell: ({ row }) => (
          <span className={cn("text-sm font-medium", NUMERIC_CLASS)}>
            {row.original.quantity}
          </span>
        ),
      },
      {
        accessorKey: "pnl",
        header: ({ column }) => (
          <SortHeader
            label="Net P&L"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <TradePnlCell
            trade={row.original}
            quote={getQuote(row.original)}
            displayCurrency={displayCurrency}
          />
        ),
      },
      {
        accessorKey: "holdTimeHours",
        header: ({ column }) => (
          <SortHeader
            label="Hold"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const hours = resolveTradeHoldHours(row.original, holdNow);
          const isActive = (row.original.status ?? "Closed") === "Active";
          return (
            <span
              className={cn(
                "text-sm text-muted-foreground",
                NUMERIC_CLASS,
                isActive && "text-foreground"
              )}
            >
              {formatHoldTime(hours)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <StaticHeader label="Actions" />,
        enableSorting: false,
        cell: ({ row }) => (
          <TradeActions
            trade={row.original}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [displayCurrency, getQuote, holdNow, onDelete, onDuplicate, onEdit, quotesLoading]
  );

  const table = useReactTable({
    data: trades,
    columns,
    state: {
      sorting,
      columnOrder: columnPrefs.order,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnOrderChange: (updater) => {
      setColumnPrefs((prev) => {
        const nextOrder =
          typeof updater === "function" ? updater(prev.order) : updater;
        return { ...prev, order: nextOrder };
      });
    },
    onColumnVisibilityChange: (updater) => {
      setColumnPrefs((prev) => {
        const current = { ...prev.visibility, actions: true };
        const nextVis =
          typeof updater === "function" ? updater(current) : updater;
        return {
          ...prev,
          visibility: {
            ...prev.visibility,
            ...nextVis,
            actions: true,
          },
        };
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });

  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalRows = trades.length;
  const rangeStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, totalRows);
  const pageRows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const equalColWidth = `${100 / Math.max(visibleColumns.length, 1)}%`;

  const paginationBar = totalRows > 0 && (
    <div className="flex flex-col gap-3 border-t border-border/80 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {rangeStart}–{rangeEnd}
        </span>{" "}
        of {totalRows}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              if (!v) return;
              table.setPageSize(Number(v));
            }}
          >
            <SelectTrigger className="h-8 w-[4.25rem] border-border/80 bg-background text-xs font-normal">
              <span>{pageSize}</span>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-8"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[5.5rem] text-center text-xs text-muted-foreground">
            {pageIndex + 1} / {pageCount || 1}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-8"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/[0.03] dark:ring-white/[0.04]">
      <header className="flex flex-col gap-3 border-b border-border/80 bg-gradient-to-r from-muted/50 via-card to-card px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Trade log
            </h2>
            {totalRows > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {totalRows} {totalRows === 1 ? "trade" : "trades"}
              </span>
            ) : null}
            {quotesDelayed && !quotesError && totalRows > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
                EODHD delayed
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Click a row to open the trade editor.
          </p>
          {quotesError ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">{quotesError}</p>
          ) : null}
        </div>
        <JournalColumnsMenu prefs={columnPrefs} onChange={setColumnPrefs} />
      </header>

      {totalRows === 0 ? (
        <div className="flex min-h-[10rem] items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
          {(totalTradeCount ?? 0) > 0
            ? "No trades match your filters."
            : "No trades yet. Add your first trade with the button above."}
        </div>
      ) : isCompact ? (
        <ul className="divide-y divide-border/80">
          {pageRows.map((row) => {
            const trade = row.original;
            const quote = getQuote(trade);
            const pnlDisplay = resolveTradePnlDisplay(
              trade,
              quote,
              displayCurrency
            );
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full border-l-[3px] px-4 py-4 text-left transition-colors",
                    rowAccentClass(trade, pnlDisplay.pnl)
                  )}
                  onClick={() => onEdit(trade)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "text-base font-bold tracking-tight",
                            NUMERIC_CLASS
                          )}
                        >
                          {trade.ticker}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 text-[10px]",
                            (trade.status ?? "Closed") === "Active"
                              ? tradeBadgeActive
                              : tradeBadgeNeutral
                          )}
                        >
                          {trade.status ?? "Closed"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 text-[10px]",
                            (trade.status ?? "Closed") === "Active"
                              ? "border-border bg-muted/40 text-muted-foreground"
                              : outcomeBadgeClass(trade.outcome)
                          )}
                        >
                          {displayTradeOutcome(trade)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(trade.entryDate), "MMM d, yyyy")} · Qty{" "}
                        {trade.quantity}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 text-right text-sm font-bold",
                        NUMERIC_CLASS,
                        pnlDisplay.pnl >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-700 dark:text-rose-400"
                      )}
                    >
                      {pnlDisplay.isUnrealized
                        ? formatSignedMoney(pnlDisplay.pnl, pnlDisplay.currency)
                        : formatCurrency(pnlDisplay.pnl)}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/25 p-2.5 sm:grid-cols-3">
                    <div className="col-span-2 sm:col-span-1">
                      <EntryExitValue
                        entry={trade.entryPrice}
                        exit={trade.exitPrice}
                        isActive={(trade.status ?? "Closed") === "Active"}
                      />
                    </div>
                    <div className="text-right sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Market
                      </p>
                      <div className="mt-0.5 flex justify-end">
                        <LivePrice
                          trade={trade}
                          quote={quote}
                          loading={quotesLoading}
                          currency={quoteDisplayCurrency(quote, displayCurrency)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Hold {formatHoldTime(resolveTradeHoldHours(trade, holdNow))}
                      {(trade.status ?? "Closed") === "Active" ? " · live" : ""}
                    </span>
                    <TradeActions
                      trade={trade}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] table-fixed border-collapse text-sm">
            <colgroup>
              {visibleColumns.map((col) => (
                <col key={col.id} style={{ width: equalColWidth }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-md">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-border bg-muted/30 text-center"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={journalHeaderClass(header.column.id)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "group cursor-pointer border-b border-border/60 border-l-[3px] text-center transition-colors last:border-b-0",
                    rowAccentClass(
                      row.original,
                      resolveTradePnlDisplay(
                        row.original,
                        getQuote(row.original),
                        displayCurrency
                      ).pnl
                    )
                  )}
                  onClick={() => onEdit(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={journalCellClass(cell.column.id)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paginationBar}
    </section>
  );
}
