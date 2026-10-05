"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { ScreenerChartButton } from "@/components/screener/screener-chart-button";
import { ScreenerSortHead } from "@/components/screener/screener-column-sort";
import {
  ScreenerPlanCells,
  ScreenerPlanHeads,
} from "@/components/screener/screener-trade-plan";
import { ScreenerLoadProgress } from "@/components/screener/screener-load-progress";
import { ScreenerRefreshButton } from "@/components/screener/screener-refresh-button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScreenerStream } from "@/hooks/use-screener-stream";
import { formatPercent } from "@/lib/analytics";
import { formatMarketPrice } from "@/lib/journal-types";
import {
  compareSortValues,
  toggleColumnSort,
  type ColumnSort,
} from "@/lib/screener/column-sort";
import { formatScreenerStamp } from "@/lib/screener/format";
import type { TradePlan } from "@/lib/screener/trade-plan";
import {
  matchesTurtleSystem,
  type TurtleSystem,
} from "@/lib/screener/turtle-rules";
import { dedupeRowsByTicker } from "@/lib/screener/dedupe-rows";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type TurtleRow = {
  ticker: string;
  name: string;
  sectorLabel: string | null;
  lastPrice: number | null;
  system: "S1" | "S2" | "W20";
  channelHigh: number | null;
  extension: number | null;
  ageBars: number | null;
  trade?: TradePlan | null;
  why: string;
};

type TurtlePayload = {
  setups: TurtleRow[];
  scanned: number;
  asOf: string;
  system: TurtleSystem;
};

function systemLabel(system: TurtleRow["system"]): string {
  if (system === "S1") return "20-day";
  if (system === "S2") return "55-day";
  return "20-week";
}

type TurtleSortKey =
  | "stock"
  | "sector"
  | "system"
  | "price"
  | "channel"
  | "break"
  | "plan"
  | "strength"
  | "why";

function turtleSortValue(
  row: TurtleRow,
  key: TurtleSortKey
): string | number | null {
  switch (key) {
    case "stock":
      return row.ticker;
    case "sector":
      return row.sectorLabel;
    case "system":
      return systemLabel(row.system);
    case "price":
      return row.lastPrice;
    case "channel":
      return row.channelHigh;
    case "break":
      return row.extension;
    case "plan":
      return row.trade?.entry ?? null;
    case "strength":
      return row.trade?.strength ?? null;
    case "why":
      return row.why;
  }
}

const TurtleSetupTable = memo(function TurtleSetupTable({
  rows,
  onOpen,
}: {
  rows: TurtleRow[];
  onOpen: (ticker: string) => void;
}) {
  const [sort, setSort] = useState<ColumnSort<TurtleSortKey> | null>(null);
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((left, right) =>
      compareSortValues(
        turtleSortValue(left, sort.key),
        turtleSortValue(right, sort.key),
        sort.direction
      )
    );
  }, [rows, sort]);

  function sortBy(key: TurtleSortKey, firstDirection: "asc" | "desc") {
    setSort((current) => toggleColumnSort(current, key, firstDirection));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <ScreenerSortHead
            label="Stock"
            active={sort?.key === "stock"}
            direction={sort?.direction ?? "asc"}
            onClick={() => sortBy("stock", "asc")}
          />
          <ScreenerSortHead
            label="Sector"
            active={sort?.key === "sector"}
            direction={sort?.direction ?? "asc"}
            onClick={() => sortBy("sector", "asc")}
          />
          <ScreenerSortHead
            label="System"
            active={sort?.key === "system"}
            direction={sort?.direction ?? "asc"}
            onClick={() => sortBy("system", "asc")}
          />
          <ScreenerSortHead
            label="Price"
            align="right"
            active={sort?.key === "price"}
            direction={sort?.direction ?? "desc"}
            onClick={() => sortBy("price", "desc")}
          />
          <ScreenerSortHead
            label="Channel"
            align="right"
            active={sort?.key === "channel"}
            direction={sort?.direction ?? "desc"}
            onClick={() => sortBy("channel", "desc")}
          />
          <ScreenerSortHead
            label="Break"
            align="right"
            active={sort?.key === "break"}
            direction={sort?.direction ?? "desc"}
            onClick={() => sortBy("break", "desc")}
          />
          <ScreenerPlanHeads
            planKey="plan"
            strengthKey="strength"
            sort={sort}
            onSort={(key) => sortBy(key, "desc")}
          />
          <ScreenerSortHead
            label="Why"
            active={sort?.key === "why"}
            direction={sort?.direction ?? "asc"}
            onClick={() => sortBy("why", "asc")}
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.map((row, index) => (
          <TableRow
            key={`${row.ticker}-${row.system}-${index}`}
            className="cursor-pointer"
            onClick={() => onOpen(row.ticker)}
          >
            <TableCell className="px-2.5 py-2.5">
              <div className="flex min-w-0 items-start gap-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {row.ticker}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.name}
                  </p>
                </div>
                <ScreenerChartButton ticker={row.ticker} label={row.name} />
              </div>
            </TableCell>
            <TableCell className="px-2.5 py-2.5 text-sm text-muted-foreground">
              {row.sectorLabel ?? "—"}
            </TableCell>
            <TableCell className="px-2.5 py-2.5 text-sm">
              {systemLabel(row.system)}
            </TableCell>
            <TableCell
              className={cn("px-2.5 py-2.5 text-right text-sm", NUMERIC_CLASS)}
            >
              {row.lastPrice != null
                ? formatMarketPrice(row.lastPrice, "INR")
                : "—"}
            </TableCell>
            <TableCell
              className={cn("px-2.5 py-2.5 text-right text-sm", NUMERIC_CLASS)}
            >
              {row.channelHigh != null
                ? formatMarketPrice(row.channelHigh, "INR")
                : "—"}
            </TableCell>
            <TableCell
              className={cn(
                "px-2.5 py-2.5 text-right text-sm text-emerald-600 dark:text-emerald-400",
                NUMERIC_CLASS
              )}
            >
              {row.extension != null
                ? `+${formatPercent(row.extension * 100, 1)}`
                : "—"}
            </TableCell>
            <ScreenerPlanCells plan={row.trade} />
            <TableCell className="max-w-[16rem] px-2.5 py-2.5 text-[11px] leading-snug text-muted-foreground">
              {row.why}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});

export function ScreenerTurtleCard() {
  const router = useRouter();
  const [system, setSystem] = useState<TurtleSystem>("s1");
  const [query, setQuery] = useState("");
  const { data, error, loading, progress, counts, reload } =
    useScreenerStream<TurtlePayload>(
      "/api/screener/turtle-breakouts?v=plan-1"
    );

  const openStock = useCallback(
    (ticker: string) => {
      router.push(`/screener/stock/${encodeURIComponent(ticker)}?from=turtle`);
    },
    [router]
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dedupeRowsByTicker(data?.setups ?? []).filter((row) => {
      if (!matchesTurtleSystem(system, row.system)) return false;
      if (!needle) return true;
      return (
        row.ticker.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        (row.sectorLabel ?? "").toLowerCase().includes(needle)
      );
    });
  }, [data?.setups, query, system]);

  return (
    <DataPanel
      title="Turtle breakout"
      subtitle="Classic Donchian breakouts in the last 1–2 sessions: 20-day (S1), 55-day (S2), or 20-week. Plan is the entry, stop, and target from the candles, RSI, and moving averages. Strength is how many of those checks line up."
      meta={
        data
          ? `${rows.length} names · scanned ${data.scanned} · ${formatScreenerStamp(null, data.asOf)}`
          : loading && progress != null
            ? `Loading turtle breakouts · ${progress}%`
            : undefined
      }
      flush
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full min-w-0 items-center gap-2 sm:max-w-md">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stocks"
              className="h-9 min-w-0 flex-1"
            />
            <ScreenerRefreshButton
              loading={loading}
              progress={progress}
              onRefresh={() => void reload()}
              className="shrink-0"
            />
          </div>
          <Tabs
            value={system}
            onValueChange={(value) => {
              if (
                value === "s1" ||
                value === "s2" ||
                value === "weekly" ||
                value === "any"
              ) {
                setSystem(value);
              }
            }}
          >
            <TabsList className="h-9">
              <TabsTrigger value="s1" className="px-3 text-xs">
                20-day
              </TabsTrigger>
              <TabsTrigger value="s2" className="px-3 text-xs">
                55-day
              </TabsTrigger>
              <TabsTrigger value="weekly" className="px-3 text-xs">
                20-week
              </TabsTrigger>
              <TabsTrigger value="any" className="px-3 text-xs">
                Any
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {error ? (
          <PanelEmpty title="Could not load turtle breakouts" hint={error} />
        ) : loading && !data ? (
          <ScreenerLoadProgress
            fetchingLabel="Fetching stocks for turtle breakouts…"
            itemLabel="stocks for turtle breakouts"
            progress={progress}
            counts={counts}
          />
        ) : rows.length === 0 ? (
          <PanelEmpty
            title="No turtle breakouts right now"
            hint="Nothing in the Indian catalog is breaking a Donchian high right now."
          />
        ) : (
          <TurtleSetupTable rows={rows} onOpen={openStock} />
        )}
      </div>
    </DataPanel>
  );
}
