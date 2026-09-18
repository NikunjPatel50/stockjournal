"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { ScreenerChartButton } from "@/components/screener/screener-chart-button";
import { Button } from "@/components/ui/button";
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
import { useScreenerJson } from "@/hooks/use-screener-json";
import { formatPercent } from "@/lib/analytics";
import { formatMarketPrice } from "@/lib/journal-types";
import { formatScreenerStamp } from "@/lib/screener/format";
import {
  ema200TimeframeLabel,
  passesEmaTimeframe,
  type EmaTimeframe,
} from "@/lib/screener/ema-rules";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type EmaSetupRow = {
  ticker: string;
  name: string;
  sectorLabel: string | null;
  lastPrice: number | null;
  daily: { holding: boolean; dist50: number | null; dist200: number | null };
  weekly: { holding: boolean; dist50: number | null; dist200: number | null };
  why: string;
};

type EmaPayload = {
  setups: EmaSetupRow[];
  scanned: number;
  asOf: string;
  timeframe: EmaTimeframe;
};

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
  const { data, error, loading, reload } = useScreenerJson<EmaPayload>(
    "/api/screener/ema-setups?v=ema200"
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.setups ?? []).filter((row) => {
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
      subtitle="Names sitting on 200 EMA support — price is above the 200 EMA and no more than 3% away, on daily and/or weekly."
      meta={
        data
          ? `${rows.length} names · scanned ${data.scanned} · ${formatScreenerStamp(null, data.asOf)}`
          : undefined
      }
      flush
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stocks"
              className="h-9 max-w-xs"
            />
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
          <div className="min-h-[16rem] animate-pulse rounded-xl bg-muted/40" />
        ) : rows.length === 0 ? (
          <PanelEmpty
            title="No names passing the filters"
            hint="Nothing in the Indian catalog is within 3% of 200 EMA support on this timeframe."
          />
        ) : (
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
                  200 Dist
                </TableHead>
                <TableHead className="h-9 bg-muted/30 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Why
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const dist = nearestDist200(row, timeframe);
                return (
                  <TableRow
                    key={`${row.ticker}-${index}`}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/screener/stock/${encodeURIComponent(row.ticker)}?from=ema`
                      )
                    }
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
                        <ScreenerChartButton
                          ticker={row.ticker}
                          label={row.name}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-2.5 py-2.5 text-sm text-muted-foreground">
                      {row.sectorLabel ?? "—"}
                    </TableCell>
                    <TableCell className="px-2.5 py-2.5 text-sm">
                      {ema200TimeframeLabel(row.daily.holding, row.weekly.holding)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-2.5 py-2.5 text-right text-sm",
                        NUMERIC_CLASS
                      )}
                    >
                      {row.lastPrice != null
                        ? formatMarketPrice(row.lastPrice, "INR")
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-2.5 py-2.5 text-right text-sm",
                        NUMERIC_CLASS
                      )}
                    >
                      {dist != null ? `+${formatPercent(dist * 100, 1)}` : "—"}
                    </TableCell>
                    <TableCell className="max-w-[16rem] px-2.5 py-2.5 text-[11px] leading-snug text-muted-foreground">
                      {row.why}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </DataPanel>
  );
}
