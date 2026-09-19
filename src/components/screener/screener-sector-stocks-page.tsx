"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, RefreshCw } from "lucide-react";
import { AppPageHeader } from "@/components/app-page-header";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { useJournalTrades } from "@/components/journal-trades-provider";
import { ScreenerChange } from "@/components/screener/screener-change";
import { ScreenerHeatmap } from "@/components/screener/screener-heatmap";
import { ScreenerPeriodTable } from "@/components/screener/screener-period-table";
import { ScreenerToolbar } from "@/components/screener/screener-toolbar";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead } from "@/components/ui/table";
import { useScreenerJson } from "@/hooks/use-screener-json";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import {
  compareScreenerRows,
  defaultScreenerSort,
  toggleScreenerSort,
} from "@/lib/screener/sort";
import { computeScreenerStrength } from "@/lib/screener/strength";
import type {
  SectorScreenerRow,
  SectorStockRow,
} from "@/lib/screener/types";
import { formatScreenerStamp } from "@/lib/screener/format";
import { dedupeRowsByTicker } from "@/lib/screener/dedupe-rows";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";

type StocksPayload = {
  sector: SectorScreenerRow;
  stocks: SectorStockRow[];
  asOf: string;
  sessionDate?: string;
};

export function ScreenerSectorStocksPage({ sectorId }: { sectorId: string }) {
  const router = useRouter();
  const { trades } = useJournalTrades();
  const { data, error, loading, reload } = useScreenerJson<StocksPayload>(
    `/api/screener/sectors/${sectorId}/stocks`
  );
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"table" | "heatmap">("table");
  const [sort, setSort] = useState(defaultScreenerSort("1m"));
  const [mineOnly, setMineOnly] = useState(false);

  const tradedTickers = useMemo(() => {
    const set = new Set<string>();
    for (const trade of trades) {
      if (trade.assetClass !== "Equities") continue;
      set.add(normalizeEquityTicker(trade.ticker));
    }
    return set;
  }, [trades]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dedupeRowsByTicker(data?.stocks ?? [])
      .filter((row) => {
        const ticker = normalizeEquityTicker(row.ticker);
        if (mineOnly && !tradedTickers.has(ticker)) return false;
        if (!needle) return true;
        return (
          row.ticker.toLowerCase().includes(needle) ||
          row.name.toLowerCase().includes(needle)
        );
      })
      .map((row) => {
        const strength = computeScreenerStrength({
          changes: row.changes,
          vsPeer: row.vsSector,
          vsBenchmark: row.vsNifty,
        });
        return {
          ...row,
          strength: strength?.score ?? null,
          why: strength?.why ?? null,
        };
      })
      .sort((a, b) =>
        compareScreenerRows(a, b, sort, a.ticker.localeCompare(b.ticker))
      );
  }, [data?.stocks, mineOnly, query, sort, tradedTickers]);

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <div>
        <Link
          href="/screener"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to sectors
        </Link>
        <AppPageHeader
          eyebrow="Screener"
          title={data?.sector.label ?? "Sector"}
          description="Stock returns versus the sector index and Nifty 50. Click a name to open the research view."
          pageActions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void reload()}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw className={loading ? "animate-spin" : undefined} />
              Refresh
            </Button>
          }
        />
      </div>

      {error ? (
        <PanelEmpty title="Could not load stocks" hint={error} />
      ) : loading && !data ? (
        <div className="min-h-[22rem] animate-pulse rounded-xl bg-muted/40" />
      ) : (
        <DataPanel
          title="Stock returns"
          subtitle="Strength blends momentum, trend direction, recent price action, and performance versus the sector and Nifty 50."
          meta={`${rows.length} stocks · ${formatScreenerStamp(data?.sessionDate, data?.asOf)}`}
          flush
        >
          <div className="space-y-4 p-4 sm:p-5">
            <ScreenerToolbar
              query={query}
              onQueryChange={setQuery}
              view={view}
              onViewChange={setView}
              searchPlaceholder="Search stocks"
              extra={
                <Button
                  type="button"
                  variant={mineOnly ? "default" : "outline"}
                  size="sm"
                  className="h-9"
                  onClick={() => setMineOnly((value) => !value)}
                >
                  <BookOpen className="size-3.5" />
                  My trades
                </Button>
              }
            />
            {rows.length === 0 ? (
              <PanelEmpty
                title="No matching stocks"
                hint={
                  mineOnly
                    ? "None of these constituents appear in your journal."
                    : "Try a different search."
                }
              />
            ) : view === "heatmap" ? (
              <ScreenerHeatmap
                rows={rows.map((row) => ({
                  id: row.ticker,
                  label: row.ticker,
                  changes: row.changes,
                  strength: row.strength,
                  why: row.why,
                }))}
                sort={sort}
                onSort={(key) =>
                  setSort((current) => toggleScreenerSort(current, key))
                }
                showChartButton
                onRowClick={(ticker) =>
                  router.push(
                    `/screener/stock/${encodeURIComponent(ticker)}?sectorId=${sectorId}`
                  )
                }
              />
            ) : (
              <ScreenerPeriodTable
                stickyLabel="Stock"
                rows={rows.map((row) => ({
                  id: row.ticker,
                  label: row.ticker,
                  subtitle: row.name,
                  changes: row.changes,
                  strength: row.strength,
                  why: row.why,
                }))}
                sort={sort}
                onSort={(key) =>
                  setSort((current) => toggleScreenerSort(current, key))
                }
                showChartButton
                extraHead={
                  <>
                    <TableHead className="h-9 bg-muted/30 px-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      vs sector
                    </TableHead>
                    <TableHead className="h-9 bg-muted/30 px-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      vs Nifty
                    </TableHead>
                  </>
                }
                renderExtra={(row) => {
                  const stock = rows.find((item) => item.ticker === row.id);
                  const traded = tradedTickers.has(normalizeEquityTicker(row.id));
                  return (
                    <>
                      <TableCell className="px-2.5 py-2.5 text-right text-sm">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          {traded ? (
                            <BookOpen
                              className="size-3 text-primary"
                              aria-label="In your journal"
                            />
                          ) : null}
                          <ScreenerChange value={stock?.vsSector[sort.period]} />
                        </span>
                      </TableCell>
                      <TableCell className="px-2.5 py-2.5 text-right text-sm">
                        <ScreenerChange value={stock?.vsNifty[sort.period]} />
                      </TableCell>
                    </>
                  );
                }}
                onRowClick={(ticker) =>
                  router.push(
                    `/screener/stock/${encodeURIComponent(ticker)}?sectorId=${sectorId}`
                  )
                }
              />
            )}
          </div>
        </DataPanel>
      )}
    </div>
  );
}
