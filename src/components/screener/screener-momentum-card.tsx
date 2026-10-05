"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { ScreenerChartButton } from "@/components/screener/screener-chart-button";
import { ScreenerLoadProgress } from "@/components/screener/screener-load-progress";
import { ScreenerRefreshButton } from "@/components/screener/screener-refresh-button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScreenerStream } from "@/hooks/use-screener-stream";
import { formatMarketPrice } from "@/lib/journal-types";
import { formatScreenerStamp } from "@/lib/screener/format";
import type {
  MomentumSetupRow,
  MomentumSetupsPayload,
  MomentumTimeframe,
} from "@/lib/screener/load-momentum-setups";
import type { MomentumSetup } from "@/lib/screener/momentum";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

function formatCrore(crore: number): string {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(crore)} Cr`;
}

function formatBreakoutDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function visibleSetup(
  row: MomentumSetupRow,
  timeframe: MomentumTimeframe
): { label: string; setup: MomentumSetup; unit: "d" | "w" } | null {
  if (timeframe === "daily") {
    return row.daily
      ? { label: "Daily", setup: row.daily, unit: "d" }
      : null;
  }
  if (timeframe === "weekly") {
    return row.weekly
      ? { label: "Weekly", setup: row.weekly, unit: "w" }
      : null;
  }
  if (row.daily && row.weekly) {
    const dailyIsNewer = row.daily.breakoutDate >= row.weekly.breakoutDate;
    return {
      label: "Daily + weekly",
      setup: dailyIsNewer ? row.daily : row.weekly,
      unit: dailyIsNewer ? "d" : "w",
    };
  }
  if (row.daily) return { label: "Daily", setup: row.daily, unit: "d" };
  if (row.weekly) return { label: "Weekly", setup: row.weekly, unit: "w" };
  return null;
}

const MomentumTable = memo(function MomentumTable({
  rows,
  timeframe,
  onOpen,
}: {
  rows: MomentumSetupRow[];
  timeframe: MomentumTimeframe;
  onOpen: (ticker: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-9 bg-muted/30 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Stock
          </TableHead>
          <TableHead className="h-9 bg-muted/30 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Sector
          </TableHead>
          <TableHead className="h-9 bg-muted/30 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Timeframe
          </TableHead>
          <TableHead className="h-9 bg-muted/30 px-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Price
          </TableHead>
          <TableHead className="h-9 bg-muted/30 px-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Mkt cap
          </TableHead>
          <TableHead className="h-9 bg-muted/30 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Breakout
          </TableHead>
          <TableHead className="h-9 bg-muted/30 px-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Volume
          </TableHead>
          <TableHead className="h-9 bg-muted/30 px-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Base
          </TableHead>
          <TableHead className="h-9 bg-muted/30 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Why
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const visible = visibleSetup(row, timeframe);
          if (!visible) return null;
          return (
          <TableRow
            key={row.ticker}
            className="cursor-pointer"
            onClick={() => onOpen(row.ticker)}
          >
            <TableCell className="px-2.5 py-2.5">
              <div className="flex min-w-0 items-start gap-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {row.ticker}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{row.name}</p>
                </div>
                <ScreenerChartButton ticker={row.ticker} label={row.name} />
              </div>
            </TableCell>
            <TableCell className="px-2.5 py-2.5 text-sm text-muted-foreground">
              {row.sectorLabel ?? "—"}
            </TableCell>
            <TableCell className="px-2.5 py-2.5 text-sm">
              {visible.label}
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
              {formatCrore(row.marketCapCrore)}
            </TableCell>
            <TableCell className="px-2.5 py-2.5 text-sm">
              {formatBreakoutDate(visible.setup.breakoutDate)}
            </TableCell>
            <TableCell
              className={cn("px-2.5 py-2.5 text-right text-sm", NUMERIC_CLASS)}
            >
              {visible.setup.volumeMultiple.toFixed(1)}×
            </TableCell>
            <TableCell
              className={cn("px-2.5 py-2.5 text-right text-sm", NUMERIC_CLASS)}
            >
              {visible.setup.consolidationBars}
              {visible.unit}
            </TableCell>
            <TableCell className="max-w-[18rem] px-2.5 py-2.5 text-[11px] leading-snug text-muted-foreground">
              {row.why}
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
});

export function ScreenerMomentumCard() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<MomentumTimeframe>("either");
  const [query, setQuery] = useState("");
  const { data, error, loading, progress, counts, reload } =
    useScreenerStream<MomentumSetupsPayload>("/api/screener/momentum?v=nse");

  const openStock = useCallback(
    (ticker: string) => {
      router.push(`/screener/stock/${encodeURIComponent(ticker)}?from=momentum`);
    },
    [router]
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.setups ?? []).filter((row) => {
      if (timeframe === "daily" && !row.daily) return false;
      if (timeframe === "weekly" && !row.weekly) return false;
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
      title="Momentum"
      subtitle="NSE-listed stocks only, above ₹10,000 Cr, checked live. Above the 50 and 200 EMA on the daily chart, the weekly chart, or both. A green candle closed through 20-bar resistance with an upper wick of 10% or less and at least 1.5× average volume, then held that break in a tight base on lighter volume."
      meta={
        data
          ? `${rows.length} names · scanned ${data.scanned} · ${formatScreenerStamp(null, data.asOf)}`
          : loading && progress != null
            ? `Loading momentum · ${progress}%`
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
              if (value === "either" || value === "daily" || value === "weekly") {
                setTimeframe(value);
              }
            }}
          >
            <TabsList className="h-9">
              <TabsTrigger value="either" className="px-3 text-xs">
                Either
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
          <PanelEmpty title="Could not load momentum setups" hint={error} />
        ) : loading && !data ? (
          <ScreenerLoadProgress
            fetchingLabel="Fetching NSE stocks above ₹10,000 Cr…"
            itemLabel="NSE stocks above ₹10,000 Cr"
            progress={progress}
            counts={counts}
          />
        ) : rows.length === 0 ? (
          <PanelEmpty
            title="No momentum bases right now"
            hint="Nothing above ₹10,000 Cr is above the 50 and 200 EMA on this timeframe, fresh off a tight high-volume breakout, and consolidating on lighter volume."
          />
        ) : (
          <MomentumTable rows={rows} timeframe={timeframe} onOpen={openStock} />
        )}
      </div>
    </DataPanel>
  );
}
