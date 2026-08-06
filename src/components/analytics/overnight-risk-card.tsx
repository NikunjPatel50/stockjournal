"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { PieChart as PieChartIcon, Table2 } from "lucide-react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/analytics";
import {
  type OvernightExposureRow,
  type OvernightRiskSummary,
} from "@/lib/overnight-risk";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const SLICE_COLORS = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#ea580c",
  "#0d9488",
];

type PieShareLabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  payload?: { share?: number };
  percent?: number;
};

function renderPieShareLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  payload,
  percent = 0,
}: PieShareLabelProps) {
  const share = payload?.share ?? percent * 100;
  if (share < 3) return null;

  const radians = (Math.PI / 180) * -midAngle;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(radians);
  const y = cy + radius * Math.sin(radians);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="pointer-events-none text-[11px] font-semibold"
      stroke="rgba(15,23,42,0.45)"
      strokeWidth={2.5}
      paintOrder="stroke"
    >
      {`${Math.round(share)}%`}
    </text>
  );
}

type ExposureView = "table" | "chart";

type RowWithShare = OvernightExposureRow & { share: number };

const headClass =
  "h-9 bg-muted/30 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const numericHeadClass = cn(headClass, "text-right");
const cellClass = "px-3 py-2.5 text-xs";
const numericCellClass = cn(cellClass, "text-right", NUMERIC_CLASS);

function gapLabel(kind: OvernightRiskSummary["marketGapKind"]) {
  if (kind === "weekend") return "weekend";
  if (kind === "holiday") return "holiday";
  return "overnight";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn("mt-0.5 truncate text-sm font-semibold", NUMERIC_CLASS)}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function GapChip({ kind }: { kind: OvernightExposureRow["gapRisk"] }) {
  if (kind === "overnight") return null;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          kind === "weekend" ? "bg-amber-500" : "bg-sky-500"
        )}
        aria-hidden
      />
      {kind === "weekend" ? "Weekend" : "Holiday"}
    </span>
  );
}

function ExposureViewToggle({
  value,
  onChange,
}: {
  value: ExposureView;
  onChange: (value: ExposureView) => void;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (next === "table" || next === "chart") onChange(next);
      }}
      className="w-auto"
    >
      <TabsList className="inline-flex h-8 rounded-lg border border-border bg-muted/60 p-0.5 shadow-none">
        <TabsTrigger
          value="table"
          className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium data-active:bg-background data-active:shadow-sm"
        >
          <Table2 className="size-3.5" />
          Table
        </TabsTrigger>
        <TabsTrigger
          value="chart"
          className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium data-active:bg-background data-active:shadow-sm"
        >
          <PieChartIcon className="size-3.5" />
          Chart
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function ExposureTable({
  rows,
  currency,
}: {
  rows: RowWithShare[];
  currency: CurrencyCode;
}) {
  return (
    <div className="-mx-4 overflow-x-auto border-t border-border/60 sm:-mx-5">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className={headClass}>Symbol</TableHead>
            <TableHead className={numericHeadClass}>Position</TableHead>
            <TableHead className={numericHeadClass}>Notional</TableHead>
            <TableHead className={cn(numericHeadClass, "w-[7rem]")}>
              Share
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.tradeId} className="border-border/60">
              <TableCell className={cellClass}>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-foreground">
                    {row.ticker}
                  </span>
                  <GapChip kind={row.gapRisk} />
                </span>
              </TableCell>
              <TableCell
                className={cn(numericCellClass, "text-muted-foreground")}
              >
                {row.quantity} × {row.priceUsed.toFixed(2)}
              </TableCell>
              <TableCell className={cn(numericCellClass, "font-semibold")}>
                {formatMoney(row.notionalAtRisk, false, currency)}
              </TableCell>
              <TableCell className={cn(cellClass, "align-middle")}>
                <div className="flex items-center justify-end gap-2">
                  <span
                    className="hidden h-1 w-12 overflow-hidden rounded-full bg-muted sm:block"
                    aria-hidden
                  >
                    <span
                      className="block h-full rounded-full bg-foreground/40"
                      style={{ width: `${row.share}%` }}
                    />
                  </span>
                  <span
                    className={cn("text-muted-foreground", NUMERIC_CLASS)}
                  >
                    {row.share.toFixed(0)}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ExposurePieChart({
  rows,
  currency,
}: {
  rows: RowWithShare[];
  currency: CurrencyCode;
}) {
  const chartData = useMemo(
    () =>
      rows.map((row, index) => ({
        name: row.ticker,
        value: row.notionalAtRisk,
        share: row.share,
        quantity: row.quantity,
        priceUsed: row.priceUsed,
        gapRisk: row.gapRisk,
        fill: SLICE_COLORS[index % SLICE_COLORS.length],
      })),
    [rows]
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const row of chartData) {
      config[row.name] = { label: row.name, color: row.fill };
    }
    return config;
  }, [chartData]);

  return (
    <div className="flex min-h-[240px] flex-1 flex-col border-t border-border/60 pt-3 sm:flex-row sm:items-stretch sm:gap-4">
      <div className="flex min-h-[200px] flex-1 items-center justify-center sm:max-w-[46%]">
        <ChartContainer
          config={chartConfig}
          initialDimension={{ width: 280, height: 280 }}
          className="aspect-square h-full w-full min-h-[200px] max-h-[min(100%,280px)] max-w-[280px]"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(_value, _name, item) => {
                    const row = item?.payload as
                      | {
                          name?: string;
                          value?: number;
                          share?: number;
                          quantity?: number;
                          priceUsed?: number;
                          gapRisk?: OvernightExposureRow["gapRisk"];
                        }
                      | undefined;
                    if (!row) return null;
                    return (
                      <div className="space-y-1 text-xs">
                        <div className="font-semibold">{row.name}</div>
                        <div>
                          Position: {row.quantity} × {row.priceUsed?.toFixed(2)}
                        </div>
                        <div>
                          Notional:{" "}
                          {formatMoney(row.value ?? 0, false, currency)}
                        </div>
                        <div>Share: {row.share?.toFixed(0)}%</div>
                        {row.gapRisk && row.gapRisk !== "overnight" ? (
                          <div className="capitalize">{row.gapRisk} gap</div>
                        ) : null}
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="52%"
              outerRadius="86%"
              strokeWidth={2}
              paddingAngle={chartData.length > 1 ? 2 : 0}
              isAnimationActive={false}
              label={renderPieShareLabel}
              labelLine={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>

      <ul className="flex min-h-[200px] flex-1 flex-col justify-between rounded-lg border border-border/50 bg-muted/15 px-2 py-1 sm:px-3">
        {rows.map((row, index) => (
          <li
            key={row.tradeId}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/40 py-2 text-[11px] last:border-b-0 sm:flex-nowrap sm:gap-2 sm:text-xs"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length],
              }}
              aria-hidden
            />
            <span className="flex w-[4.25rem] shrink-0 items-center gap-1 truncate font-semibold text-foreground">
              {row.ticker}
              <GapChip kind={row.gapRisk} />
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-muted-foreground",
                NUMERIC_CLASS
              )}
            >
              {row.quantity} × {row.priceUsed.toFixed(2)}
            </span>
            <span className={cn("shrink-0 font-semibold", NUMERIC_CLASS)}>
              {formatMoney(row.notionalAtRisk, false, currency)}
            </span>
            <span
              className={cn(
                "w-8 shrink-0 text-right text-muted-foreground",
                NUMERIC_CLASS
              )}
            >
              {row.share.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OvernightRiskCard({
  summary,
  currency = DEFAULT_CURRENCY,
  className,
}: {
  summary: OvernightRiskSummary;
  currency?: CurrencyCode;
  className?: string;
}) {
  const [view, setView] = useState<ExposureView>("chart");
  const hasEquity = summary.accountEquity > 0;
  const gap = gapLabel(summary.marketGapKind);
  const largest = summary.rows[0] ?? null;

  const rowsWithShare = useMemo(
    () =>
      summary.rows.map((row) => ({
        ...row,
        share: summary.totalExposed
          ? (row.notionalAtRisk / summary.totalExposed) * 100
          : 0,
      })),
    [summary.rows, summary.totalExposed]
  );

  if (summary.rows.length === 0) {
    return (
      <DataPanel
        title="Overnight exposure"
        subtitle="Capital carried through the next market gap"
        className={className}
      >
        <PanelEmpty
          title="No open positions"
          hint="Nothing is exposed to the next overnight or weekend gap."
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel
      title="Overnight exposure"
      subtitle={`Open positions carried through the next ${gap} gap`}
      action={<ExposureViewToggle value={view} onChange={setView} />}
      className={className}
      bodyClassName={cn(
        "flex flex-col gap-4 p-4 sm:p-5",
        view === "chart" && "sm:min-h-[360px]"
      )}
    >
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Account equity"
          value={
            hasEquity
              ? formatMoney(summary.accountEquity, false, currency)
              : "Not set"
          }
        />
        <Stat label="Open positions" value={String(summary.rows.length)} />
        <Stat
          label="Largest position"
          value={
            largest
              ? `${largest.ticker} · ${((largest.notionalAtRisk / summary.totalExposed) * 100).toFixed(0)}%`
              : "—"
          }
        />
      </div>

      {view === "table" ? (
        <ExposureTable rows={rowsWithShare} currency={currency} />
      ) : (
        <div className="flex flex-1 flex-col">
          <ExposurePieChart rows={rowsWithShare} currency={currency} />
        </div>
      )}
    </DataPanel>
  );
}
