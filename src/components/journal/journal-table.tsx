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
import { useJournalMarket } from "@/components/journal/journal-market-provider";
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
import { resolveTradePnlDisplay, resolveMaxProfitLossDisplay, formatTradeRiskReward, computeActivePortfolioWeights } from "@/lib/trade-pnl";
import {
  computeTradeDailyPnlFromQuote,
  toActivePositionPnlInput,
} from "@/lib/active-position-daily-pnl";
import {
  loadJournalColumnPrefs,
  saveJournalColumnPrefs,
  sanitizeJournalColumnOrder,
  type JournalColumnPrefs,
} from "@/lib/journal-column-prefs";
import { JournalColumnsMenu } from "@/components/journal/journal-columns-menu";
import { MarketSessionTimer } from "@/components/journal/market-session-timer";
import { TargetStopProgressBar } from "@/components/journal/target-stop-progress-bar";
import { useEarningsDates } from "@/hooks/use-earnings-dates";
import { useMarketQuotes, type ClientMarketQuote } from "@/hooks/use-market-quotes";
import { useIsJournalCompact } from "@/hooks/use-media-query";
import type { CurrencyCode } from "@/lib/settings";
import { parseEarningsDisplayDate, type EarningsDateInfo } from "@/lib/yahoo-earnings";
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
    columnId === "currentPrice" && "pr-5 sm:pr-7",
    columnId === "pnl" && "pl-5 sm:pl-7",
    "py-3 align-middle text-center [text-align:center]"
  );
}

function journalHeaderClass(columnId: string) {
  return cn(
    columnId === "expand" ? "w-7 px-0" : CELL_X,
    columnId === "currentPrice" && "pr-5 sm:pr-7",
    columnId === "pnl" && "pl-5 sm:pl-7",
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
}: {
  label: string;
  sorted: false | "asc" | "desc";
}) {
  return (
    <span
      className={cn(
        "group inline-flex w-full items-center justify-center gap-1 rounded-md px-1 py-1 text-xs font-medium tracking-tight",
        sorted ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <span className="text-center">{label}</span>
      <span
        className={cn(
          "inline-flex shrink-0",
          !sorted && "opacity-40 transition-opacity group-hover:opacity-80"
        )}
        aria-hidden
      >
        {sorted === "asc" ? (
          <ArrowUp className="size-3.5 text-foreground" />
        ) : sorted === "desc" ? (
          <ArrowDown className="size-3.5 text-foreground" />
        ) : (
          <ArrowUpDown className="size-3.5" />
        )}
      </span>
    </span>
  );
}

function outcomeBadgeClass(outcome: JournalTrade["outcome"]) {
  if (outcome === "Win") return tradeBadgePositive;
  if (outcome === "Loss") return tradeBadgeNegative;
  return "border-border bg-muted/50 text-foreground";
}

function hasStopAboveEntry(trade: JournalTrade): boolean {
  const { entryPrice, stopLoss } = trade;
  if (!entryPrice || !stopLoss || stopLoss <= 0) return false;
  return hasDistinctLevel(stopLoss, entryPrice) && stopLoss > entryPrice;
}

function rowAccentClass(trade: JournalTrade, livePnl?: number) {
  if (hasStopAboveEntry(trade)) {
    return "border-l-4 border-l-sky-600 bg-card hover:bg-muted/50 dark:border-l-sky-400";
  }
  const pnl = livePnl ?? trade.pnl;
  if (pnl > 0) {
    return "border-l-4 border-l-emerald-500 bg-card hover:bg-muted/50";
  }
  if (pnl < 0) {
    return "border-l-4 border-l-rose-500 bg-card hover:bg-muted/50";
  }
  if (trade.status === "Active") {
    return "border-l-4 border-l-emerald-500/70 bg-card hover:bg-muted/50";
  }
  return "border-l-4 border-l-transparent bg-card hover:bg-muted/40";
}

function RowColorLegend() {
  const items = [
    {
      label: "In profit",
      swatch:
        "border-l-[3px] border-l-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/30",
    },
    {
      label: "In loss",
      swatch: "border-l-[3px] border-l-rose-500 bg-rose-500/20 dark:bg-rose-500/30",
    },
    {
      label: "Stoploss above entry",
      swatch: "border-l-[3px] border-l-sky-600 bg-sky-500/25 dark:border-l-sky-400 dark:bg-sky-500/35",
    },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"
        >
          <span
            className={cn("h-3 w-4 shrink-0 rounded-sm", item.swatch)}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function JournalRowAccordionPanel({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">
        {className ? <div className={className}>{children}</div> : children}
      </div>
    </div>
  );
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

  const displayDate = parseEarningsDisplayDate(earnings.nextEarningsDate);
  if (!displayDate) {
    return <span className="text-sm text-muted-foreground">Not scheduled</span>;
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("text-sm font-medium", NUMERIC_CLASS)}>
        {format(displayDate, "MMM d, yyyy")}
      </span>
      {earnings.isEstimate ? (
        <span className="text-[10px] text-muted-foreground">Estimated</span>
      ) : null}
    </div>
  );
}

function PortfolioWeightValue({
  trade,
  portfolioPct,
}: {
  trade: JournalTrade;
  portfolioPct: number | null;
}) {
  if ((trade.status ?? "Closed") !== "Active" || portfolioPct == null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <span className={cn("text-sm font-medium", NUMERIC_CLASS)}>
      {portfolioPct.toFixed(1)}%
    </span>
  );
}

function RowAccordionDetails({
  trade,
  quote,
  displayCurrency,
  earnings,
  earningsLoading,
  portfolioPct,
}: {
  trade: JournalTrade;
  quote: ClientMarketQuote | null;
  displayCurrency: CurrencyCode;
  earnings: EarningsDateInfo | null;
  earningsLoading: boolean;
  portfolioPct: number | null;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm ring-1 ring-foreground/[0.03] dark:ring-white/[0.04]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-1 divide-y divide-border/50 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-6">
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
        <AccordionDetailCell label="% of portfolio">
          <PortfolioWeightValue trade={trade} portfolioPct={portfolioPct} />
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

function DailyPnlCell({
  trade,
  quote,
  displayCurrency,
  loading,
}: {
  trade: JournalTrade;
  quote: ClientMarketQuote | null;
  displayCurrency: CurrencyCode;
  loading: boolean;
}) {
  const isActive = (trade.status ?? "Closed") === "Active";

  if (!isActive) {
    return (
      <span className="block w-full text-center text-sm text-muted-foreground">
        —
      </span>
    );
  }

  const input = toActivePositionPnlInput(trade);
  const daily =
    input && quote?.price
      ? computeTradeDailyPnlFromQuote(
          input,
          { price: quote.price, changePercent: quote.changePercent },
          displayCurrency
        )
      : null;

  if (daily == null) {
    if (loading) {
      return (
        <span className="mx-auto inline-block h-4 w-14 animate-pulse rounded bg-muted" />
      );
    }
    return (
      <span className="block w-full text-center text-sm text-muted-foreground">
        —
      </span>
    );
  }

  const currency = quoteDisplayCurrency(quote, displayCurrency);

  return (
    <p
      className={cn(
        "whitespace-nowrap text-center text-sm font-semibold",
        NUMERIC_CLASS,
        daily >= 0
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-rose-700 dark:text-rose-400"
      )}
    >
      {formatSignedMoney(daily, currency)}
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
  compact = false,
}: {
  trade: JournalTrade;
  onEdit: (t: JournalTrade) => void;
  onDuplicate: (t: JournalTrade) => void;
  onDelete: (ids: string[]) => void;
  className?: string;
  compact?: boolean;
}) {
  const actionSize = compact ? "icon" : "icon-sm";

  return (
    <div
      className={cn("flex items-center justify-center gap-0.5", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size={actionSize}
        title="Edit trade"
        aria-label="Edit trade"
        onClick={() => onEdit(trade)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={actionSize}
        title="Duplicate trade"
        aria-label="Duplicate trade"
        onClick={() => onDuplicate(trade)}
      >
        <Copy className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={actionSize}
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
  /** Override display currency (e.g. journal market switcher). */
  displayCurrency?: CurrencyCode;
  onEdit: (trade: JournalTrade) => void;
  onDuplicate: (trade: JournalTrade) => void;
  onDelete: (ids: string[]) => void;
  /** Show column visibility menu (default true). */
  showColumnsMenu?: boolean;
  /** Poll live quotes for active rows (default true). */
  enableLiveQuotes?: boolean;
  /** Pre-fetched earnings lookup (avoids duplicate API calls when multiple tables mount). */
  getEarningsDate?: (trade: JournalTrade) => EarningsDateInfo | null;
  earningsLoading?: boolean;
}

type QuoteSlice = {
  getQuote: (trade: JournalTrade) => ClientMarketQuote | null;
  quoteRevision: number;
  quotesLoading: boolean;
  quotesError: string | null;
  quotesDelayed: boolean;
  quotesSessionOpen: boolean;
};

const STATIC_QUOTE_SLICE: QuoteSlice = {
  getQuote: () => null,
  quoteRevision: 0,
  quotesLoading: false,
  quotesError: null,
  quotesDelayed: true,
  quotesSessionOpen: false,
};

export function JournalTable(props: JournalTableProps) {
  if (props.enableLiveQuotes === false) {
    return (
      <JournalTableInner
        {...props}
        enableLiveQuotes={false}
        quoteSlice={STATIC_QUOTE_SLICE}
      />
    );
  }
  return <JournalTableLive {...props} />;
}

function JournalTableLive(props: JournalTableProps) {
  const sharedQuotes = useMarketQuotes();
  const quoteSlice = useMemo(
    () => ({
      getQuote: sharedQuotes.getQuote,
      quoteRevision: sharedQuotes.quoteRevision,
      quotesLoading: sharedQuotes.loading,
      quotesError: sharedQuotes.error,
      quotesDelayed: sharedQuotes.delayed,
      quotesSessionOpen: sharedQuotes.sessionOpen,
    }),
    [
      sharedQuotes.getQuote,
      sharedQuotes.quoteRevision,
      sharedQuotes.loading,
      sharedQuotes.error,
      sharedQuotes.delayed,
      sharedQuotes.sessionOpen,
    ]
  );

  return (
    <JournalTableInner
      {...props}
      enableLiveQuotes
      quoteSlice={quoteSlice}
    />
  );
}

function JournalTableInner({
  trades,
  title = "Trade log",
  totalTradeCount,
  displayCurrency: displayCurrencyProp,
  onEdit,
  onDuplicate,
  onDelete,
  showColumnsMenu = true,
  enableLiveQuotes = true,
  getEarningsDate: getEarningsDateProp,
  earningsLoading: earningsLoadingProp,
  quoteSlice,
}: JournalTableProps & { quoteSlice: QuoteSlice }) {
  const isCompact = useIsJournalCompact();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "entryDate", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [columnPrefs, setColumnPrefs] = useState<JournalColumnPrefs>(() =>
    loadJournalColumnPrefs()
  );
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());

  const { activeCurrency } = useJournalMarket();
  const displayCurrency = displayCurrencyProp ?? activeCurrency;

  const {
    getQuote,
    quoteRevision,
    quotesLoading,
    quotesError,
    quotesDelayed,
    quotesSessionOpen,
  } = quoteSlice;

  const {
    getEarningsDate: getEarningsDateFromHook,
    loading: earningsLoadingFromHook,
  } = useEarningsDates(trades, displayCurrency, getEarningsDateProp == null);

  const getEarningsDate = getEarningsDateProp ?? getEarningsDateFromHook;
  const earningsLoading = earningsLoadingProp ?? earningsLoadingFromHook;

  const holdNow = useHoldTimeClock(60_000);

  const portfolioWeights = useMemo(
    () => computeActivePortfolioWeights(trades),
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
                  "size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
                  expanded && "rotate-90"
                )}
              />
            </button>
          );
        },
      },
      {
        accessorKey: "entryDate",
        sortingFn: "datetime",
        header: ({ column }) => (
          <SortHeader label="Date" sorted={column.getIsSorted()} />
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
          <SortHeader label="Symbol" sorted={column.getIsSorted()} />
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
        header: () => <StaticHeader label="Entry / Exit" />,
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
        cell: ({ row }) => {
          const quote = getQuote(row.original);
          const isActive = (row.original.status ?? "Closed") === "Active";
          return (
            <LivePriceInline
              trade={row.original}
              quote={quote}
              loading={isActive && quotesLoading && quote == null}
              currency={displayCurrency}
            />
          );
        },
      },
      {
        accessorKey: "quantity",
        sortDescFirst: true,
        header: ({ column }) => (
          <SortHeader label="Qty" sorted={column.getIsSorted()} />
        ),
        cell: ({ row }) => (
          <span className={cn("block w-full text-center text-sm font-medium", NUMERIC_CLASS)}>
            {row.original.quantity}
          </span>
        ),
      },
      {
        id: "invested",
        accessorFn: (row) => row.entryPrice * row.quantity,
        sortDescFirst: true,
        header: ({ column }) => (
          <SortHeader label="Invested" sorted={column.getIsSorted()} />
        ),
        cell: ({ row }) => {
          const invested = row.original.entryPrice * row.original.quantity;
          const sharePct = portfolioWeights.get(row.original.id) ?? null;

          return (
            <span
              className={cn(
                "inline-block whitespace-nowrap text-center text-sm font-medium",
                NUMERIC_CLASS
              )}
            >
              {formatMarketPrice(invested, displayCurrency)}
              {sharePct != null ? (
                <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                  ({sharePct.toFixed(1)}%)
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        id: "pnl",
        accessorFn: (row) =>
          resolveTradePnlDisplay(row, getQuote(row), displayCurrency).pnl,
        sortDescFirst: true,
        header: ({ column }) => (
          <SortHeader label="Net P&L" sorted={column.getIsSorted()} />
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
        id: "dailyPnl",
        accessorFn: (row) => {
          const input = toActivePositionPnlInput(row);
          if (!input) return Number.NEGATIVE_INFINITY;
          const quote = getQuote(row);
          const daily = computeTradeDailyPnlFromQuote(
            input,
            quote?.price
              ? { price: quote.price, changePercent: quote.changePercent }
              : null,
            displayCurrency
          );
          return daily ?? Number.NEGATIVE_INFINITY;
        },
        sortDescFirst: true,
        header: ({ column }) => (
          <SortHeader label="Daily P/L" sorted={column.getIsSorted()} />
        ),
        cell: ({ row }) => {
          const quote = getQuote(row.original);
          const isActive = (row.original.status ?? "Closed") === "Active";
          return (
            <DailyPnlCell
              trade={row.original}
              quote={quote}
              displayCurrency={displayCurrency}
              loading={enableLiveQuotes && isActive && quotesLoading && quote == null}
            />
          );
        },
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
        sortDescFirst: true,
        header: ({ column }) => (
          <SortHeader label="R:R" sorted={column.getIsSorted()} />
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
        id: "targetStopProgress",
        header: () => <StaticHeader label="Target / Stop" />,
        enableSorting: false,
        cell: ({ row }) => {
          const trade = row.original;
          const quote = getQuote(trade);
          const isActive = (trade.status ?? "Closed") === "Active";
          const currentPrice = isActive
            ? (quote?.price ?? null)
            : trade.exitPrice > 0
              ? trade.exitPrice
              : null;

          return (
            <TargetStopProgressBar
              trade={trade}
              currentPrice={currentPrice}
              loading={isActive && quotesLoading && currentPrice == null}
            />
          );
        },
      },
      {
        id: "holdTimeHours",
        accessorFn: (row) => resolveTradeHoldHours(row, holdNow),
        sortDescFirst: true,
        header: ({ column }) => (
          <SortHeader label="Hold" sorted={column.getIsSorted()} />
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
      enableLiveQuotes,
      expandedRowIds,
      getQuote,
      holdNow,
      onDelete,
      onDuplicate,
      onEdit,
      quoteRevision,
      quotesLoading,
      portfolioWeights,
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
    enableSortingRemoval: true,
    onSortingChange: (updater) => {
      setSorting((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        return next.length === 0 ? [{ id: "entryDate", desc: true }] : next;
      });
    },
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
    <div className="flex flex-col gap-2.5 border-t border-border/70 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[11px] tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">
          {rangeStart}–{rangeEnd}
        </span>
        <span className="mx-1.5 text-border">·</span>
        {totalRows} {totalRows === 1 ? "trade" : "trades"}
      </p>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 p-0.5">
          <span className="hidden pl-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:inline">
            Rows
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              if (!v) return;
              table.setPageSize(Number(v));
            }}
          >
            <SelectTrigger className="h-7 w-[3.25rem] border-0 bg-transparent text-xs font-medium shadow-none hover:bg-background/80">
              <span>{pageSize}</span>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center rounded-lg border border-border/70 bg-muted/30 p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-md disabled:opacity-35"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-[3.75rem] px-1 text-center text-[11px] font-medium tabular-nums text-foreground">
            {pageIndex + 1}
            <span className="text-muted-foreground"> / {pageCount || 1}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-md disabled:opacity-35"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <section className="cv-section overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/[0.03] dark:ring-white/[0.04]">
      <header className="flex flex-col gap-3 border-b border-border/80 bg-card px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
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
            {!quotesError && hasActiveTrades && enableLiveQuotes ? (
              <MarketSessionTimer trades={trades} currency={displayCurrency} />
            ) : null}
          </div>
          {totalRows > 0 ? <RowColorLegend /> : null}
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
            const dailyInput = toActivePositionPnlInput(trade);
            const dailyPnl =
              dailyInput && quote?.price
                ? computeTradeDailyPnlFromQuote(
                    dailyInput,
                    {
                      price: quote.price,
                      changePercent: quote.changePercent,
                    },
                    displayCurrency
                  )
                : null;
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
                      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      aria-expanded={expanded}
                      aria-label={expanded ? "Hide row details" : "Show row details"}
                      onClick={() => toggleRowExpanded(row.id)}
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
                          expanded && "rotate-90"
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => toggleRowExpanded(row.id)}
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
                          {dailyPnl != null ? (
                            <p
                              className={cn(
                                "mt-0.5 text-[11px] font-semibold",
                                dailyPnl >= 0
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-rose-700 dark:text-rose-400"
                              )}
                            >
                              Daily{" "}
                              {formatSignedMoney(
                                dailyPnl,
                                quoteDisplayCurrency(quote, displayCurrency)
                              )}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="space-y-3 px-4 pb-4 pl-14">
                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/25 p-2.5 sm:grid-cols-3">
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
                              loading={
                                (trade.status ?? "Closed") === "Active" &&
                                quotesLoading &&
                                quote == null
                              }
                              currency={quoteDisplayCurrency(quote, displayCurrency)}
                            />
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Target / Stop
                          </p>
                          <TargetStopProgressBar
                            trade={trade}
                            currentPrice={
                              (trade.status ?? "Closed") === "Active"
                                ? (quote?.price ?? null)
                                : trade.exitPrice > 0
                                  ? trade.exitPrice
                                  : null
                            }
                            loading={
                              (trade.status ?? "Closed") === "Active" &&
                              quotesLoading &&
                              quote?.price == null
                            }
                            compact
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Hold {formatHoldTime(resolveTradeHoldHours(trade, holdNow))}
                          {(trade.status ?? "Closed") === "Active" ? " · live" : ""}
                        </span>
                        <TradeActions
                          trade={trade}
                          onEdit={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                          compact
                        />
                      </div>
                  </div>

                  <JournalRowAccordionPanel
                    open={expanded}
                    className="border-t border-border/50 bg-muted/15 px-3 py-2.5"
                  >
                    <RowAccordionDetails
                      trade={trade}
                      quote={quote}
                      displayCurrency={displayCurrency}
                      earnings={getEarningsDate(trade)}
                      earningsLoading={earningsLoading}
                      portfolioPct={portfolioWeights.get(trade.id) ?? null}
                    />
                  </JournalRowAccordionPanel>
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
            <thead className="sticky top-0 z-10 border-b border-border bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-border bg-muted/30 text-center"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          journalHeaderClass(header.column.id),
                          canSort &&
                            "cursor-pointer select-none hover:bg-muted/50"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : canSort
                                ? "none"
                                : undefined
                        }
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
                    );
                  })}
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
                      onClick={() => toggleRowExpanded(row.id)}
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
                    <tr className="border-0">
                      <td colSpan={visibleCellCount} className="p-0 align-top">
                        <JournalRowAccordionPanel
                          open={expanded}
                          className="border-b border-border/60 bg-muted/15 px-4 pb-3 pt-1"
                        >
                          <RowAccordionDetails
                            trade={row.original}
                            quote={getQuote(row.original)}
                            displayCurrency={displayCurrency}
                            earnings={getEarningsDate(row.original)}
                            earningsLoading={earningsLoading}
                            portfolioPct={
                              portfolioWeights.get(row.original.id) ?? null
                            }
                          />
                        </JournalRowAccordionPanel>
                      </td>
                    </tr>
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
