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
  matchesTurtleSystem,
  type TurtleSystem,
} from "@/lib/screener/turtle-rules";
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

export function ScreenerTurtleCard() {
  const router = useRouter();
  const [system, setSystem] = useState<TurtleSystem>("s1");
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useScreenerJson<TurtlePayload>(
    "/api/screener/turtle-breakouts?v=tech"
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.setups ?? []).filter((row) => {
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
      subtitle="Classic Donchian breakouts in the last 1–2 sessions: 20-day (S1), 55-day (S2), or 20-week."
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
          <div className="min-h-[16rem] animate-pulse rounded-xl bg-muted/40" />
        ) : rows.length === 0 ? (
          <PanelEmpty
            title="No turtle breakouts right now"
            hint="Nothing in the Indian catalog is breaking a Donchian high right now."
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
                  System
                </TableHead>
                <TableHead className="h-9 bg-muted/30 px-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Price
                </TableHead>
                <TableHead className="h-9 bg-muted/30 px-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Channel
                </TableHead>
                <TableHead className="h-9 bg-muted/30 px-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Break
                </TableHead>
                <TableHead className="h-9 bg-muted/30 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Why
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={`${row.ticker}-${row.system}`}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/screener/stock/${encodeURIComponent(row.ticker)}?from=turtle`
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
                  <TableCell className="max-w-[16rem] px-2.5 py-2.5 text-[11px] leading-snug text-muted-foreground">
                    {row.why}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DataPanel>
  );
}
