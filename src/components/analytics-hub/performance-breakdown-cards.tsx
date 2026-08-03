"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatPercent } from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";
import {
  computePerformanceBreakdown,
  type PerformanceBreakdownRow,
} from "@/lib/performance-breakdown";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import type { CurrencyCode } from "@/lib/settings";
import type { TickerFundamentals } from "@/lib/yahoo-fundamentals";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type PerformanceBreakdownCardsProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

const MAX_ROWS = 8;

const headClass =
  "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const numericHeadClass = cn(headClass, "text-right");
const cellClass = "px-3 py-2.5 text-xs";
const numericCellClass = cn(cellClass, "text-right", NUMERIC_CLASS);

function BreakdownTable({
  title,
  subtitle,
  rows,
  currency,
  loading,
  emptyTitle,
  emptyHint,
}: {
  title: string;
  subtitle: string;
  rows: PerformanceBreakdownRow[];
  currency: CurrencyCode;
  loading: boolean;
  emptyTitle: string;
  emptyHint: string;
}) {
  const visibleRows = rows.slice(0, MAX_ROWS);

  return (
    <DataPanel
      title={title}
      subtitle={subtitle}
      meta={
        loading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            Loading
          </span>
        ) : (
          `${rows.length} group${rows.length === 1 ? "" : "s"}`
        )
      }
      flush
      footer={
        rows.length > MAX_ROWS
          ? `Showing top ${MAX_ROWS} of ${rows.length} groups by net P&L.`
          : undefined
      }
    >
      {loading && rows.length === 0 ? (
        <div className="flex min-h-[12rem] items-center justify-center p-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading sector and market-cap data…
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="p-4 sm:p-5">
          <PanelEmpty title={emptyTitle} hint={emptyHint} />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <TableHead className={headClass}>Group</TableHead>
              <TableHead className={numericHeadClass}>Trades</TableHead>
              <TableHead className={numericHeadClass}>Win rate</TableHead>
              <TableHead className={numericHeadClass}>Avg R</TableHead>
              <TableHead className={numericHeadClass}>Net P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.label} className="border-border/60">
                <TableCell
                  className={cn(cellClass, "max-w-[12rem] truncate font-medium")}
                >
                  {row.label}
                </TableCell>
                <TableCell className={numericCellClass}>{row.trades}</TableCell>
                <TableCell className={numericCellClass}>
                  {formatPercent(row.winRate)}
                </TableCell>
                <TableCell
                  className={cn(numericCellClass, "text-muted-foreground")}
                >
                  {row.avgR !== null ? `${row.avgR.toFixed(2)}R` : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    numericCellClass,
                    "font-semibold",
                    row.totalPnl > 0 && "text-emerald-600 dark:text-emerald-400",
                    row.totalPnl < 0 && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatMoney(row.totalPnl, true, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataPanel>
  );
}

export function PerformanceBreakdownCards({
  trades,
  currency,
}: PerformanceBreakdownCardsProps) {
  const [fundamentals, setFundamentals] = useState<
    Record<string, TickerFundamentals | null>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equitySymbols = useMemo(() => {
    const seen = new Set<string>();
    const symbols: Array<{
      ticker: string;
      assetClass: JournalTrade["assetClass"];
      listingMarket: JournalTrade["listingMarket"];
    }> = [];

    for (const trade of trades) {
      if (trade.assetClass !== "Equities") continue;
      const listingMarket =
        normalizeListingMarket(trade.listingMarket) ??
        defaultListingMarketForCurrency(currency);
      const key = `${trade.ticker}|${trade.assetClass}|${listingMarket}`;
      if (seen.has(key)) continue;
      seen.add(key);
      symbols.push({
        ticker: trade.ticker,
        assetClass: trade.assetClass,
        listingMarket,
      });
    }

    return symbols;
  }, [trades, currency]);

  useEffect(() => {
    if (equitySymbols.length === 0) {
      setFundamentals({});
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetch("/api/market-data/fundamentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: equitySymbols }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          error?: string;
          fundamentals?: Record<string, TickerFundamentals | null>;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load fundamentals");
        }
        setFundamentals(data.fundamentals ?? {});
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Could not load fundamentals"
        );
        setFundamentals({});
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [equitySymbols]);

  const sectorRows = useMemo(
    () => computePerformanceBreakdown(trades, fundamentals, currency, "sector"),
    [trades, fundamentals, currency]
  );
  const marketCapRows = useMemo(
    () =>
      computePerformanceBreakdown(trades, fundamentals, currency, "marketCap"),
    [trades, fundamentals, currency]
  );

  if (trades.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
        <DataPanel
          title="Performance by sector"
          subtitle="Realized P&L grouped by company sector"
        >
          <PanelEmpty
            title="No closed trades in this period"
            hint="Close equity trades to see sector attribution."
          />
        </DataPanel>
        <DataPanel
          title="Performance by market cap"
          subtitle="Realized P&L grouped by company size"
        >
          <PanelEmpty
            title="No closed trades in this period"
            hint="Close equity trades to see market-cap attribution."
          />
        </DataPanel>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Some sector and market-cap data could not be loaded. Groups may show
          as unknown.
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
        <BreakdownTable
          title="Performance by sector"
          subtitle="Realized P&L grouped by company sector"
          rows={sectorRows}
          currency={currency}
          loading={loading}
          emptyTitle="No sector data yet"
          emptyHint="Trade listed equities to populate sector breakdown."
        />
        <BreakdownTable
          title="Performance by market cap"
          subtitle="Realized P&L grouped by large, mid, small, and micro cap"
          rows={marketCapRows}
          currency={currency}
          loading={loading}
          emptyTitle="No market-cap data yet"
          emptyHint="Trade listed equities to populate market-cap breakdown."
        />
      </div>
    </div>
  );
}
