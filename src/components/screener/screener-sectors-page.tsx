"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppPageHeader } from "@/components/app-page-header";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { ScreenerHeatmap } from "@/components/screener/screener-heatmap";
import { ScreenerPeriodTable } from "@/components/screener/screener-period-table";
import { ScreenerRefreshButton } from "@/components/screener/screener-refresh-button";
import { ScreenerToolbar } from "@/components/screener/screener-toolbar";
import { useScreenerSectors } from "@/hooks/use-screener-sectors";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { formatScreenerStamp } from "@/lib/screener/format";
import {
  compareScreenerRows,
  defaultScreenerSort,
  toggleScreenerSort,
} from "@/lib/screener/sort";
import {
  computeScreenerStrength,
  relativePeriodChanges,
} from "@/lib/screener/strength";
import { tradingViewSymbolFromYahoo } from "@/lib/tradingview";

export function ScreenerSectorsPage({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const router = useRouter();
  const { data, error, loading, progress, reload } = useScreenerSectors();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"table" | "heatmap">("table");
  const [sort, setSort] = useState(defaultScreenerSort("1w"));

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sectors = data?.sectors ?? [];
    const nifty = sectors.find((row) => row.isBenchmark);
    const filtered = sectors
      .filter((row) =>
        needle
          ? row.label.toLowerCase().includes(needle) ||
            row.id.toLowerCase().includes(needle)
          : true
      )
      .map((row) => {
        const vsNifty =
          nifty && !row.isBenchmark
            ? relativePeriodChanges(row.changes, nifty.changes)
            : null;
        const strength = computeScreenerStrength({
          changes: row.changes,
          vsBenchmark: vsNifty,
        });
        return {
          ...row,
          strength: strength?.score ?? null,
          why: strength?.why ?? null,
        };
      });

    const benchmark = filtered.find((row) => row.isBenchmark);
    const rest = filtered
      .filter((row) => !row.isBenchmark)
      .sort((a, b) =>
        compareScreenerRows(a, b, sort, a.label.localeCompare(b.label))
      );

    return benchmark ? [benchmark, ...rest] : rest;
  }, [data?.sectors, query, sort]);

  const body = (
    <DataPanel
      title="Sectors"
      subtitle="Official NSE sector & thematic index returns as of the last close — same universe as NSE All Sectors scanners. Open a row to research constituent stocks."
      meta={
        data
          ? `${rows.length} sectors · ${formatScreenerStamp(data.sessionDate, data.asOf)}`
          : loading && progress != null
            ? `Loading sectors · ${progress}%`
            : undefined
      }
      flush
    >
      <div className="space-y-4 p-4 sm:p-5">
        <ScreenerToolbar
          query={query}
          onQueryChange={setQuery}
          view={view}
          onViewChange={setView}
          searchPlaceholder="Search sectors"
          extra={
            <ScreenerRefreshButton
              loading={loading}
              progress={progress}
              onRefresh={() => void reload()}
            />
          }
        />

        {error ? (
          <PanelEmpty title="Could not load sectors" hint={error} />
        ) : loading && !data ? (
          <div className="space-y-4">
            <div className="min-h-[14rem] animate-pulse rounded-xl bg-muted/40" />
            <div className="mx-auto max-w-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Fetching 53 NSE sector indices…</span>
                <span className="tabular-nums text-foreground">{progress ?? 0}%</span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={progress ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress ?? 0))}%` }}
                />
              </div>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <PanelEmpty
            title="No matching sectors"
            hint="Try a different search."
          />
        ) : view === "heatmap" ? (
          <ScreenerHeatmap
            rows={rows.map((row) => ({
              ...row,
              chartSymbol: tradingViewSymbolFromYahoo(row.symbol),
            }))}
            sort={sort}
            onSort={(key) => setSort((current) => toggleScreenerSort(current, key))}
            showChartButton
            onRowClick={(id) => {
              if (id === "nifty-50") return;
              router.push(`/screener/${id}`);
            }}
          />
        ) : (
          <ScreenerPeriodTable
            stickyLabel="Sector"
            rows={rows.map((row) => ({
              id: row.id,
              label: row.label,
              subtitle: row.isBenchmark ? "Benchmark" : undefined,
              muted: row.isBenchmark,
              changes: row.changes,
              strength: row.strength,
              why: row.why,
              chartSymbol: tradingViewSymbolFromYahoo(row.symbol),
            }))}
            sort={sort}
            onSort={(key) => setSort((current) => toggleScreenerSort(current, key))}
            showChartButton
            onRowClick={(id) => {
              if (id === "nifty-50") return;
              router.push(`/screener/${id}`);
            }}
          />
        )}
      </div>
    </DataPanel>
  );

  if (embedded) return body;

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AppPageHeader
        eyebrow="Private"
        title="Screener"
        description="Official NSE sector & thematic index returns as of the last close."
      />
      {body}
    </div>
  );
}
