"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  outcomeFromPnl,
  resolveTradeHoldHours,
  type JournalTrade,
} from "@/lib/journal-types";
import { useHoldTimeClock } from "@/hooks/use-hold-time-clock";
import { resolveTradePnlDisplay, resolveMaxProfitLossDisplay, formatTradeRiskReward } from "@/lib/trade-pnl";
import {
  loadJournalColumnPrefs,
  saveJournalColumnPrefs,
  sanitizeJournalColumnOrder,
  type JournalColumnPrefs,
} from "@/lib/journal-column-prefs";
import { JournalColumnsMenu } from "@/components/journal/journal-columns-menu";
import { useEarningsDates } from "@/hooks/use-earnings-dates";
import { useMarketQuotes, type ClientMarketQuote } from "@/hooks/use-market-quotes";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { CurrencyCode } from "@/lib/settings";
import type { EarningsDateInfo } from "@/lib/yahoo-earnings";
import {
  cn,
  NUMERIC_CLASS,
  tradeBadgeActive,
  tradeBadgeNegative,
  tradeBadgeNeutral,
  tradeBadgePositive,
} from "@/lib/utils";

const CELL_X = "px-3";
const CELL_CENTER = "flex w-full items-center justify-center text-center";

function journalCellClass(columnId: string) {
  return cn(
    columnId === "expand" ? "w-7 px-0" : CELL_X,
    "py-3 align-middle text-center [text-align:center]"
  );
}

function journalHeaderClass(columnId: string) {
  return cn(
    columnId === "expand" ? "w-7 px-0" : CELL_X,
    "h-10 border-r border-border/50 py-2 align-middle text-center [text-align:center] last:border-r-0"
  );
}

function StaticHeader({ label }: { label: string }) {
  return (
    <span className="mx-auto block w-full text-center text-xs font-medium tracking-tight text-muted-foreground">
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
        "group relative flex w-full items-center justify-center rounded-md px-2 py-1 text-xs font-medium tracking-tight transition-colors",
        sorted
          ? "text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <span className="text-center">{label}</span>
      <span
        className={cn(
          "absolute right-0.5 top-1/2 -translate-y-1/2",
          !sorted && "opacity-0 transition-opacity group-hover:opacity-50"
        )}
        aria-hidden
      >
        {sorted === "asc" ? (
          <ArrowUp className="size-3.5 shrink-0 text-foreground" />
        ) : sorted === "desc" ? (
          <ArrowDown className="size-3.5 shrink-0 text-foreground" />
        ) : (
          <ArrowUpDown className="size-3.5 shrink-0" />
        )}
      </span>
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

function hasDistinctLevel(price: number, entry: number): boolean {
  return price > 0 && Math.abs(price - entry) / entry > 0.000_01;
}

function pctChangeFromEntry(entryPrice: number, levelPrice: number): string {
  const pct = ((levelPrice - entryPrice) / entryPrice) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `(${sign}${pct.toFixed(1)}%)`;
}

function ProfitTargetStopLossValue({ trade }: { trade: JournalTrade }) {
  const { profitTarget, stopLoss, entryPrice } = trade;
  const hasTarget = hasDistinctLevel(profitTarget, entryPrice);
  const hasStop = hasDistinctLevel(stopLoss, entryPrice);

  if (!hasTarget && !hasStop) {
    return (
      <span className="block w-full text-center text-sm text-muted-foreground">
        —
      </span>
    );
  }

  return (
    <span
      className={cn(
        "mx-auto block w-full whitespace-nowrap text-center text-sm font-medium",
        NUMERIC_CLASS
      )}
    >
      <span className="text-emerald-700 dark:text-emerald-400">
        {hasTarget ? (
          <>
            {formatCompactPrice(profitTarget)}
            <span className="ml-0.5 text-[11px] font-medium">
              {pctChangeFromEntry(entryPrice, profitTarget)}
            </span>
          </>
        ) : (
          "—"
        )}
      </span>
      <span className="px-0.5 text-muted-foreground">/</span>
      <span className="text-rose-700 dark:text-rose-400">
        {hasStop ? (
          <>
            {formatCompactPrice(stopLoss)}
            <span className="ml-0.5 text-[11px] font-medium">
              {pctChangeFromEntry(entryPrice, stopLoss)}
            </span>
          </>
        ) : (
          "—"
        )}
      </span>
    </span>
  );
}

function MaxProfitLossValue({
  trade,
  displayCurrency,
}: {
  trade: JournalTrade;
  displayCurrency: CurrencyCode;
}) {
  const { maxProfit, maxLoss, currency } = resolveMaxProfitLossDisplay(
    trade,
    null,
    displayCurrency
  );

  if (maxProfit == null && maxLoss == null) {
    return (
      <span className="block w-full text-center text-sm text-muted-foreground">
        —
      </span>
    );
  }

  return (
    <span
      className={cn(
        "mx-auto block w-full whitespace-nowrap text-center text-sm font-medium",
        NUMERIC_CLASS
      )}
    >
      <span className="text-emerald-700 dark:text-emerald-400">
        {maxProfit != null ? formatSignedMoney(maxProfit, currency) : "—"}
      </span>
      <span className="px-0.5 text-muted-foreground">/</span>
      <span className="text-rose-700 dark:text-rose-400">
        {maxLoss != null ? formatSignedMoney(maxLoss, currency) : "—"}
      </span>
    </span>
  );
}

function TradeStatusBadge({ trade }: { trade: JournalTrade }) {
  const status = trade.status ?? "Closed";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        status === "Active" ? tradeBadgeActive : tradeBadgeNeutral
      )}
    >
      {status}
    </Badge>
  );
}

function TradeOutcomeBadge({
  trade,
  quote,
  displayCurrency,
}: {
  trade: JournalTrade;
  quote: ClientMarketQuote | null;
  displayCurrency: CurrencyCode;
}) {
  const { pnl: livePnl } = resolveTradePnlDisplay(trade, quote, displayCurrency);
  const isActive = (trade.status ?? "Closed") === "Active";
  const outcome = isActive ? outcomeFromPnl(livePnl) : trade.outcome;
  const label = displayTradeOutcome(trade, { livePnl });

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", outcomeBadgeClass(outcome))}
    >
      {label}
    </Badge>
  );
}

function AccordionDetailCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 border-border/50 px-4 py-3 text-center sm:border-r sm:last:border-r-0">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <div className="flex min-h-[1.375rem] w-full items-center justify-center text-center text-sm leading-none">
        {children}
      </div>
    </div>
  );
}

function NextEarningsDateValue({
  trade,
  earnings,
  loading,
}: {
  trade: JournalTrade;
  earnings: EarningsDateInfo | null;
  loading: boolean;
}) {
  if (trade.assetClass !== "Equities") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  if (loading && !earnings) {
    return <span className="text-xs text-muted-foreground">Loading…</span>;
  }

  if (!earnings?.nextEarningsDate) {
    return <span className="text-sm text-muted-foreground">Not scheduled</span>;
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("text-sm font-medium", NUMERIC_CLASS)}>
        {format(new Date(`${earnings.nextEarningsDate}T12:00:00`), "MMM d, yyyy")}
      </span>
      {earnings.isEstimate ? (
        <span className="text-[10px] text-muted-foreground">Estimated</span>
      ) : null}
    </div>
  );
}

function RowAccordionDetails({
  trade,
  quote,
  displayCurrency,
  earnings,
  earningsLoading,
}: {
  trade: JournalTrade;
  quote: ClientMarketQuote | null;
  displayCurrency: CurrencyCode;
  earnings: EarningsDateInfo | null;
  earningsLoading: boolean;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm ring-1 ring-foreground/[0.03] dark:ring-white/[0.04]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-b border-border/60 bg-muted/35 px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Trade details
        </span>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border/50 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5">
        <AccordionDetailCell label="Status">
          <TradeStatusBadge trade={trade} />
        </AccordionDetailCell>
        <AccordionDetailCell label="Outcome">
          <TradeOutcomeBadge
            trade={trade}
            quote={quote}
            displayCurrency={displayCurrency}
          />
        </AccordionDetailCell>
        <AccordionDetailCell label="Profit target / Stop loss">
          <ProfitTargetStopLossValue trade={trade} />
        </AccordionDetailCell>
        <AccordionDetailCell label="Max profit / Max loss">
          <MaxProfitLossValue trade={trade} displayCurrency={displayCurrency} />
        </AccordionDetailCell>
        <AccordionDetailCell label="Next earnings date">
          <NextEarningsDateValue
            trade={trade}
            earnings={earnings}
            loading={earningsLoading}
          />
        </AccordionDetailCell>
      </div>
    </div>
  );
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
    <p
      className={cn(
        "whitespace-nowrap text-center text-sm font-semibold",
        NUMERIC_CLASS,
        pnl >= 0
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-rose-700 dark:text-rose-400"
      )}
    >
      {isUnrealized ? formatSignedMoney(pnl, currency) : formatCurrency(pnl)}
      <span className="ml-1 text-[11px] font-medium opacity-80">
        ({roi >= 0 ? "+" : ""}
        {roi.toFixed(2)}%)
      </span>
    </p>
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
    return (
      <span className="block text-center text-muted-foreground">—</span>
    );
  }

  if (!quote && loading) {
    return (
      <span className="mx-auto inline-block h-4 w-16 animate-pulse rounded bg-muted" />
    );
  }

  if (!quote?.price) {
    return (
      <span className="block text-center text-muted-foreground">—</span>
    );
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
        ) : (
          <span className="text-[10px] text-muted-foreground">Last close</span>
        )}
      </div>
    </div>
  );
}

function LivePriceInline({
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
  if (trade.assetClass === "Options") {
    return (
      <span className="block w-full text-center text-sm text-muted-foreground">—</span>
    );
  }

  if (!quote && loading) {
    return (
      <span className="mx-auto block h-4 w-16 animate-pulse rounded bg-muted" />
    );
  }

  if (!quote?.price) {
    return (
      <span className="block w-full text-center text-sm text-muted-foreground">—</span>
    );
  }

  const displayCurrency = quoteDisplayCurrency(quote, currency);
  const change = quote.changePercent;
  const changeUp = change !== null && change > 0;
  const changeDown = change !== null && change < 0;

  return (
    <div className={cn("w-full text-center", NUMERIC_CLASS)}>
      <span className="inline-block whitespace-nowrap text-sm font-semibold">
      {formatMarketPrice(quote.price, displayCurrency)}
      {change !== null ? (
        <span
          className={cn(
            "ml-1 text-[11px] font-medium",
            changeUp && "text-emerald-700 dark:text-emerald-400",
            changeDown && "text-rose-700 dark:text-rose-400",
            !changeUp && !changeDown && "text-muted-foreground"
          )}
        >
          ({change >= 0 ? "+" : ""}
          {change.toFixed(2)}%)
        </span>
      ) : null}
      </span>
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
    <span
      className={cn(
        "block w-full text-center text-sm font-medium text-foreground",
        NUMERIC_CLASS
      )}
    >
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
      className={cn("flex items-center justify-center gap-0.5", className)}
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
  /** Section title in the card header. */
  title?: string;
  /** All trades in this section before header filters (for empty-state copy). */
  totalTradeCount?: number;
  onEdit: (trade: JournalTrade) => void;
  onDuplicate: (trade: JournalTrade) => void;
  onDelete: (ids: string[]) => void;
  /** Show column visibility menu (default true). */
  showColumnsMenu?: boolean;
}

export function JournalTable({
  trades,
  title = "Trade log",
  totalTradeCount,
  onEdit,
  onDuplicate,
  onDelete,
  showColumnsMenu = true,
}: JournalTableProps) {
  const isCompact = useMediaQuery("(max-width: 1023px)");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "entryDate", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [columnPrefs, setColumnPrefs] = useState<JournalColumnPrefs>(() =>
    loadJournalColumnPrefs()
  );
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());

  const { settings } = useSettings();
  const displayCurrency = settings.profile.currency;

  const {
    getQuote,
    loading: quotesLoading,
    error: quotesError,
    delayed: quotesDelayed,
    sessionOpen: quotesSessionOpen,
  } = useMarketQuotes(trades, displayCurrency);

  const {
    getEarningsDate,
    loading: earningsLoading,
  } = useEarningsDates(trades, displayCurrency);

  const holdNow = useHoldTimeClock(60_000);

  const totalInvestedInTable = useMemo(
    () =>
      trades.reduce((sum, trade) => sum + trade.entryPrice * trade.quantity, 0),
    [trades]
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [trades.length]);

  useEffect(() => {
    setColumnPrefs((prev) => {
      const order = sanitizeJournalColumnOrder(prev.order);
      if (order.every((id, i) => id === prev.order[i])) return prev;
      return { ...prev, order };
    });
  }, []);

  useEffect(() => {
    saveJournalColumnPrefs(columnPrefs);
  }, [columnPrefs]);

  const columnOrder = useMemo(() => {
    const middle = sanitizeJournalColumnOrder(columnPrefs.order).filter(
      (id) => id !== "expand"
    );
    return ["expand", ...middle];
  }, [columnPrefs.order]);

  const columnVisibility = useMemo(
    () => ({
      ...columnPrefs.visibility,
      expand: true,
      actions: true,
      status: false,
      outcome: false,
      targetStop: false,
      profitTargetStopLoss: false,
    }),
    [columnPrefs.visibility]
  );

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const columns = useMemo<ColumnDef<JournalTrade>[]>(
    () => [
      {
        id: "expand",
        header: () => <span className="sr-only">Details</span>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const expanded = expandedRowIds.has(row.id);
          return (
            <button
              type="button"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              aria-expanded={expanded}
              aria-label={expanded ? "Hide row details" : "Show row details"}
              onClick={(e) => {
                e.stopPropagation();
                toggleRowExpanded(row.id);
              }}
            >
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform",
                  expanded && "rotate-90"
                )}
              />
            </button>
          );
        },
      },
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
          <span className="block w-full text-center text-sm font-medium text-foreground">
            {format(new Date(row.original.entryDate), "MMM d, yyyy")}
          </span>
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
        cell: ({ row }) => (
          <span
            className={cn(
              "block w-full text-center text-sm font-bold tracking-tight",
              NUMERIC_CLASS
            )}
          >
            {row.original.ticker}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => <StaticHeader label="Status" />,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <TradeStatusBadge trade={row.original} />
          </div>
        ),
      },
      {
        id: "outcome",
        header: () => <StaticHeader label="Outcome" />,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <TradeOutcomeBadge
              trade={row.original}
              quote={getQuote(row.original)}
              displayCurrency={displayCurrency}
            />
          </div>
        ),
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
        enableSorting: false,
        cell: ({ row }) => (
          <LivePriceInline
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
          <span className={cn("block w-full text-center text-sm font-medium", NUMERIC_CLASS)}>
            {row.original.quantity}
          </span>
        ),
      },
      {
        id: "invested",
        accessorFn: (row) => row.entryPrice * row.quantity,
        header: ({ column }) => (
          <SortHeader
            label="Invested"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const invested = row.original.entryPrice * row.original.quantity;
          const sharePct =
            totalInvestedInTable > 0
              ? (invested / totalInvestedInTable) * 100
              : 0;

          return (
            <span
              className={cn(
                "inline-block whitespace-nowrap text-center text-sm font-medium",
                NUMERIC_CLASS
              )}
            >
              {formatMarketPrice(invested, displayCurrency)}
              <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                ({sharePct.toFixed(1)}%)
              </span>
            </span>
          );
        },
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
        id: "targetStop",
        accessorFn: (row) =>
          resolveMaxProfitLossDisplay(row, null, displayCurrency).maxProfit ??
          Number.NEGATIVE_INFINITY,
        header: () => <StaticHeader label="Max profit / Max loss" />,
        enableSorting: false,
        cell: ({ row }) => (
          <MaxProfitLossValue
            trade={row.original}
            displayCurrency={displayCurrency}
          />
        ),
      },
      {
        id: "profitTargetStopLoss",
        accessorFn: (row) => row.profitTarget,
        header: () => <StaticHeader label="Profit target / Stop loss" />,
        enableSorting: false,
        cell: ({ row }) => (
          <ProfitTargetStopLossValue trade={row.original} />
        ),
      },
      {
        id: "riskReward",
        accessorFn: (row) => {
          const rr = formatTradeRiskReward(row);
          if (!rr) return Number.NEGATIVE_INFINITY;
          const ratio = Number(rr.split(":")[1]);
          return Number.isFinite(ratio) ? ratio : Number.NEGATIVE_INFINITY;
        },
        header: ({ column }) => (
          <SortHeader
            label="R:R"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const rr = formatTradeRiskReward(row.original);
          return (
            <span className={cn("block w-full text-center text-sm font-medium", NUMERIC_CLASS)}>
              {rr ?? "—"}
            </span>
          );
        },
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
                "block w-full text-center text-sm text-muted-foreground",
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
    [
      displayCurrency,
      expandedRowIds,
      getQuote,
      holdNow,
      onDelete,
      onDuplicate,
      onEdit,
      quotesLoading,
      totalInvestedInTable,
    ]
  );

  const table = useReactTable({
    data: trades,
    columns,
    state: {
      sorting,
      columnOrder,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnOrderChange: (updater) => {
      setColumnPrefs((prev) => {
        const nextOrder =
          typeof updater === "function"
            ? updater(sanitizeJournalColumnOrder(prev.order))
            : updater;
        return { ...prev, order: sanitizeJournalColumnOrder(nextOrder) };
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
  const hasActiveTrades = trades.some(
    (trade) => (trade.status ?? "Closed") === "Active"
  );
  const rangeStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, totalRows);
  const pageRows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const expandColWidth = "1.75rem";
  const dataColumnCount = visibleColumns.filter((c) => c.id !== "expand").length;
  const equalColWidth =
    dataColumnCount > 0
      ? `calc((100% - ${expandColWidth}) / ${dataColumnCount})`
      : "100%";

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
              <SelectItem value="5">5</SelectItem>
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
              {title}
            </h2>
            {totalRows > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {totalRows} {totalRows === 1 ? "trade" : "trades"}
              </span>
            ) : null}
            {quotesDelayed && quotesSessionOpen && !quotesError && totalRows > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
                EODHD delayed
              </span>
            ) : null}
            {!quotesSessionOpen && !quotesError && hasActiveTrades ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-slate-400" aria-hidden />
                Market closed
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
        {showColumnsMenu ? (
          <JournalColumnsMenu prefs={columnPrefs} onChange={setColumnPrefs} />
        ) : null}
      </header>

      {totalRows === 0 ? (
        <div className="flex min-h-[10rem] items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
          {(totalTradeCount ?? 0) > 0
            ? "No trades match your filters."
            : title.toLowerCase().includes("closed")
              ? "No closed trades yet. Set status to Closed when you exit a position."
              : "No active trades yet. Log a trade with status Active."}
        </div>
      ) : isCompact ? (
        <ul className="divide-y divide-border/80">
          {pageRows.map((row) => {
            const trade = row.original;
            const quote = getQuote(trade);
            const expanded = expandedRowIds.has(row.id);
            const pnlDisplay = resolveTradePnlDisplay(
              trade,
              quote,
              displayCurrency
            );
            return (
              <li key={row.id}>
                <div
                  className={cn(
                    "border-l-[3px]",
                    rowAccentClass(trade, pnlDisplay.pnl)
                  )}
                >
                  <div className="flex items-start gap-2 px-4 py-4">
                    <button
                      type="button"
                      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      aria-expanded={expanded}
                      aria-label={expanded ? "Hide row details" : "Show row details"}
                      onClick={() => toggleRowExpanded(row.id)}
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 transition-transform",
                          expanded && "rotate-90"
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onEdit(trade)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span
                            className={cn(
                              "text-base font-bold tracking-tight",
                              NUMERIC_CLASS
                            )}
                          >
                            {trade.ticker}
                          </span>
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
                  </div>

                  {expanded ? (
                    <div className="border-t border-border/50 bg-muted/15 px-3 py-2.5">
                      <RowAccordionDetails
                        trade={trade}
                        quote={quote}
                        displayCurrency={displayCurrency}
                        earnings={getEarningsDate(trade)}
                        earningsLoading={earningsLoading}
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[72rem] table-fixed border-collapse text-center text-sm">
            <colgroup>
              {visibleColumns.map((col) => (
                <col
                  key={col.id}
                  style={{
                    width:
                      col.id === "expand"
                        ? expandColWidth
                        : equalColWidth,
                  }}
                />
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
                      <div
                        className={
                          header.column.id === "expand"
                            ? "flex justify-center"
                            : CELL_CENTER
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const expanded = expandedRowIds.has(row.id);
                const visibleCellCount = row.getVisibleCells().length;

                return (
                  <Fragment key={row.id}>
                    <tr
                      className={cn(
                        "group cursor-pointer border-b text-center transition-colors",
                        expanded
                          ? "border-border/40 border-l-[3px]"
                          : "border-border/60 border-l-[3px] last:border-b-0",
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
                          <div
                            className={cn(
                              CELL_CENTER,
                              cell.column.id === "expand" && "w-7"
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-border/60 last:border-b-0">
                        <td
                          colSpan={visibleCellCount}
                          className="bg-muted/15 px-4 pb-3 pt-1"
                        >
                          <RowAccordionDetails
                            trade={row.original}
                            quote={getQuote(row.original)}
                            displayCurrency={displayCurrency}
                            earnings={getEarningsDate(row.original)}
                            earningsLoading={earningsLoading}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paginationBar}
    </section>
  );
}
