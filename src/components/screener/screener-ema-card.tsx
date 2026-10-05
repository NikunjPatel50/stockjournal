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
  ema200TimeframeLabel,
  passesEmaTimeframe,
  type EmaTimeframe,
} from "@/lib/screener/ema-rules";
import { dedupeRowsByTicker } from "@/lib/screener/dedupe-rows";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type EmaSetupRow = {
  ticker: string;
  name: string;
  sectorLabel: string | null;
  lastPrice: number | null;
  daily: { holding: boolean; dist50: number | null; dist200: number | null };
  weekly: { holding: boolean; dist50: number | null; dist200: number | null };
  tradeDaily?: TradePlan | null;
  tradeWeekly?: TradePlan | null;
  why: string;
};

type EmaPayload = {
  setups: EmaSetupRow[];
  scanned: number;
  asOf: string;
  timeframe: EmaTimeframe;
};

type EmaSortKey =
  | "stock"
  | "sector"
  | "timeframe"
  | "price"
  | "dist"
  | "plan"
  | "strength"
  | "why";

function emaSortValue(
  row: EmaSetupRow,
  key: EmaSortKey,
  timeframe: EmaTimeframe
): string | number | null {
  const plan = visibleEmaPlan(row, timeframe);
  switch (key) {
    case "stock":
      return row.ticker;
    case "sector":
      return row.sectorLabel;
    case "timeframe":
      return ema200TimeframeLabel(row.daily.holding, row.weekly.holding);
    case "price":
      return row.lastPrice;
    case "dist":
      return nearestDist200(row, timeframe);
    case "plan":
      return plan?.entry ?? null;
    case "strength":
      return plan?.strength ?? null;
    case "why":
      return row.why;
  }
}

const EmaSetupTable = memo(function EmaSetupTable({
  rows,
  timeframe,
  onOpen,
}: {
  rows: EmaSetupRow[];
  timeframe: EmaTimeframe;
  onOpen: (ticker: string) => void;
}) {
  const [sort, setSort] = useState<ColumnSort<EmaSortKey> | null>(null);
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((left, right) =>
      compareSortValues(
        emaSortValue(left, sort.key, timeframe),
        emaSortValue(right, sort.key, timeframe),
        sort.direction
      )
    );
  }, [rows, sort, timeframe]);

  function sortBy(key: EmaSortKey, firstDirection: "asc" | "desc") {
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
            label="Timeframe"
            active={sort?.key === "timeframe"}
            direction={sort?.direction ?? "asc"}
            onClick={() => sortBy("timeframe", "asc")}
          />
          <ScreenerSortHead
            label="Price"
            align="right"
            active={sort?.key === "price"}
            direction={sort?.direction ?? "desc"}
            onClick={() => sortBy("price", "desc")}
          />
          <ScreenerSortHead
            label="200 Dist"
            align="right"
            active={sort?.key === "dist"}
            direction={sort?.direction ?? "asc"}
            onClick={() => sortBy("dist", "asc")}
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
        {sortedRows.map((row, index) => {
          const dist = nearestDist200(row, timeframe);
          return (
            <TableRow
              key={`${row.ticker}-${index}`}
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
                {ema200TimeframeLabel(row.daily.holding, row.weekly.holding)}
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
                {dist != null ? `+${formatPercent(dist * 100, 1)}` : "—"}
              </TableCell>
              <ScreenerPlanCells
                plan={visibleEmaPlan(row, timeframe)}
                showFrame={timeframe === "both"}
              />
              <TableCell className="max-w-[16rem] px-2.5 py-2.5 text-[11px] leading-snug text-muted-foreground">
                {row.why}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
});

function visibleEmaPlan(
  row: EmaSetupRow,
  timeframe: EmaTimeframe
): TradePlan | null {
  if (timeframe === "daily") return row.tradeDaily ?? null;
  if (timeframe === "weekly") return row.tradeWeekly ?? null;
  const dailyDist = row.daily.holding ? row.daily.dist200 : null;
  const weeklyDist = row.weekly.holding ? row.weekly.dist200 : null;
  if (dailyDist == null) return row.tradeWeekly ?? null;
  if (weeklyDist == null) return row.tradeDaily ?? null;
  return dailyDist <= weeklyDist
    ? (row.tradeDaily ?? null)
    : (row.tradeWeekly ?? null);
}

function nearestDist200(
  row: EmaSetupRow,
  timeframe: EmaTimeframe
): number | null {
  const values = [
    (timeframe === "weekly" ? null : row.daily.dist200),
    (timeframe === "daily" ? null : row.weekly.dist200),
  ].filter((value): value is number => value != null);
  if (values.length === 0) return null;
  return Math.min(...values);
}

export function ScreenerEmaCard() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<EmaTimeframe>("daily");
  const [query, setQuery] = useState("");
  const { data, error, loading, progress, counts, reload } = useScreenerStream<EmaPayload>(
    "/api/screener/ema-setups?v=plan-1"
  );

  const openStock = useCallback(
    (ticker: string) => {
      router.push(`/screener/stock/${encodeURIComponent(ticker)}?from=ema`);
    },
    [router]
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dedupeRowsByTicker(data?.setups ?? []).filter((row) => {
      if (!passesEmaTimeframe(timeframe, row.daily.holding, row.weekly.holding)) {
        return false;
      }
      if (!needle) return true;
      return (
        row.ticker.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        (row.sectorLabel ?? "").toLowerCase().includes(needle)
      );
    });
  }, [data?.setups, query, timeframe]);

  return (
    <DataPanel
      title="EMA support"
      subtitle="Names sitting on 200 EMA support. Price is above the 200 EMA and no more than 3% away, on daily and/or weekly. Plan is the entry, stop, and target from the candles, RSI, and moving averages. Strength is how many of those checks line up."
      meta={
        data
          ? `${rows.length} names · scanned ${data.scanned} · ${formatScreenerStamp(null, data.asOf)}`
          : loading && progress != null
            ? `Loading EMA support · ${progress}%`
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
            value={timeframe}
            onValueChange={(value) => {
              if (value === "daily" || value === "weekly" || value === "both") {
                setTimeframe(value);
              }
            }}
          >
            <TabsList className="h-9">
              <TabsTrigger value="both" className="px-3 text-xs">
                Daily + weekly
              </TabsTrigger>
              <TabsTrigger value="daily" className="px-3 text-xs">
                Daily
              </TabsTrigger>
              <TabsTrigger value="weekly" className="px-3 text-xs">
                Weekly
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {error ? (
          <PanelEmpty title="Could not load EMA setups" hint={error} />
        ) : loading && !data ? (
          <ScreenerLoadProgress
            fetchingLabel="Fetching stocks for EMA support…"
            itemLabel="stocks for EMA support"
            progress={progress}
            counts={counts}
          />
        ) : rows.length === 0 ? (
          <PanelEmpty
            title="No names passing the filters"
            hint="Nothing in the Indian catalog is within 3% of 200 EMA support on this timeframe."
          />
        ) : (
          <EmaSetupTable rows={rows} timeframe={timeframe} onOpen={openStock} />
        )}
      </div>
    </DataPanel>
  );
}
