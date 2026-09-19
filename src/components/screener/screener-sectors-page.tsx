"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppPageHeader } from "@/components/app-page-header";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { ScreenerHeatmap } from "@/components/screener/screener-heatmap";
import { ScreenerPeriodTable } from "@/components/screener/screener-period-table";
import { ScreenerRefreshButton } from "@/components/screener/screener-refresh-button";
import { ScreenerToolbar } from "@/components/screener/screener-toolbar";
import { prefetchScreenerJson } from "@/hooks/use-screener-json";
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
import { tradingViewSymbolForSectorId } from "@/lib/screener/indian-sectors";

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

  useEffect(() => {
    if (!embedded || !data) return;
    const id = window.setTimeout(() => {
      void prefetchScreenerJson("/api/screener/ema-setups?v=ema200-5");
      void prefetchScreenerJson("/api/screener/turtle-breakouts?v=tech");
    }, 400);
    return () => window.clearTimeout(id);
  }, [data, embedded]);

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
          <div className="space-y-3">
            <div className="min-h-[14rem] animate-pulse rounded-xl bg-muted/40" />
            <p className="text-center text-xs text-muted-foreground">
              Fetching {progress ?? 0}% of 53 NSE sector indices…
            </p>
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
              chartSymbol: tradingViewSymbolForSectorId(row.id),
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
              chartSymbol: tradingViewSymbolForSectorId(row.id),
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
