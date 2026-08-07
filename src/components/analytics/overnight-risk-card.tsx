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

const legendHeadClass =
  "h-8 bg-muted/40 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:px-3";
const legendHeadFirst = cn(legendHeadClass, "pl-3 sm:pl-4");
const legendHeadNumeric = cn(legendHeadClass, "text-right");
const legendHeadLast = cn(legendHeadNumeric, "pr-3 sm:pr-4");
const legendCellClass = "px-2.5 py-2 text-[11px] sm:px-3 sm:text-xs";
const legendCellFirst = cn(legendCellClass, "pl-3 sm:pl-4");
const legendCellNumeric = cn(legendCellClass, "text-right whitespace-nowrap", NUMERIC_CLASS);
const legendCellLast = cn(legendCellClass, "pr-3 sm:pr-4");

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
    <div className="min-w-0 text-center">
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

const EXPOSURE_VIEW_OPTIONS = [
  { value: "table" as const, label: "Table", icon: Table2 },
  { value: "chart" as const, label: "Chart", icon: PieChartIcon },
];

function ExposureViewToggle({
  value,
  onChange,
}: {
  value: ExposureView;
  onChange: (value: ExposureView) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Overnight exposure view"
      className="inline-flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5"
    >
      {EXPOSURE_VIEW_OPTIONS.map(({ value: optionValue, label, icon: Icon }) => {
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={active}
            aria-label={`${label} view`}
            title={label}
            onClick={() => onChange(optionValue)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
            )}
          >
            <Icon
              className="size-3.5 shrink-0"
              strokeWidth={active ? 2.25 : 2}
              aria-hidden
            />
            <span className="hidden min-[420px]:inline">{label}</span>
          </button>
        );
      })}
    </div>
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
    <div className="overflow-x-auto border-t border-border/60">
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
              <TableCell className={cn(cellClass, "text-right align-middle")}>
                <span className={cn("text-muted-foreground", NUMERIC_CLASS)}>
                  {row.share.toFixed(0)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ExposureLegendPanel({
  rows,
  currency,
  className,
}: {
  rows: RowWithShare[];
  currency: CurrencyCode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 overflow-hidden rounded-lg border-2 border-border/70 bg-muted/15",
        className
      )}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className={legendHeadFirst}>Symbol</TableHead>
              <TableHead className={legendHeadNumeric}>Position</TableHead>
              <TableHead className={legendHeadNumeric}>Notional</TableHead>
              <TableHead className={legendHeadLast}>Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.tradeId} className="border-border/40">
                <TableCell className={legendCellFirst}>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          SLICE_COLORS[index % SLICE_COLORS.length],
                      }}
                      aria-hidden
                    />
                    <span className="flex min-w-0 items-center gap-1 font-semibold text-foreground">
                      {row.ticker}
                      <GapChip kind={row.gapRisk} />
                    </span>
                  </span>
                </TableCell>
                <TableCell
                  className={cn(legendCellNumeric, "text-muted-foreground")}
                >
                  {row.quantity} × {row.priceUsed.toFixed(2)}
                </TableCell>
                <TableCell className={cn(legendCellNumeric, "font-semibold")}>
                  {formatMoney(row.notionalAtRisk, false, currency)}
                </TableCell>
                <TableCell className={cn(legendCellLast, "text-right")}>
                  <span className={cn("text-muted-foreground", NUMERIC_CLASS)}>
                    {row.share.toFixed(0)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
    <div className="flex min-h-[240px] flex-1 flex-col border-t border-border/60 pt-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="mx-auto flex min-h-[200px] w-full max-w-[240px] shrink-0 items-center justify-center sm:mx-0 sm:w-[40%] sm:max-w-[240px]">
        <ChartContainer
          config={chartConfig}
          initialDimension={{ width: 240, height: 240 }}
          className="aspect-square h-full w-full min-h-[200px] max-h-[240px] max-w-[240px]"
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

      <ExposureLegendPanel rows={rows} currency={currency} className="w-full" />
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
  const smallest = summary.rows[summary.rows.length - 1] ?? null;

  const formatPositionShare = (row: OvernightExposureRow | null) =>
    row && summary.totalExposed > 0
      ? `${row.ticker} · ${((row.notionalAtRisk / summary.totalExposed) * 100).toFixed(0)}%`
      : "—";

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          value={formatPositionShare(largest)}
        />
        <Stat
          label="Smallest position"
          value={formatPositionShare(smallest)}
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
