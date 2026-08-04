"use client";

import { DataPanel, PanelEmpty } from "@/components/data-panel";
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
  DEFAULT_OVERNIGHT_RISK_DANGER_PCT,
  DEFAULT_OVERNIGHT_RISK_WARN_PCT,
  overnightRiskTone,
  type OvernightExposureRow,
  type OvernightRiskSummary,
} from "@/lib/overnight-risk";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { cn, NUMERIC_CLASS, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

type Tone = ReturnType<typeof overnightRiskTone>;

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

/** Exposure stays neutral until it crosses a threshold worth acting on. */
function toneText(tone: Tone) {
  if (tone === "danger") return "text-rose-600 dark:text-rose-400";
  if (tone === "warn") return "text-amber-600 dark:text-amber-400";
  return "text-foreground";
}

function toneFill(tone: Tone) {
  if (tone === "danger") return "bg-rose-500";
  if (tone === "warn") return "bg-amber-500";
  return "bg-foreground/45";
}

function toneSummary(tone: Tone) {
  if (tone === "danger") {
    return `Above the ${DEFAULT_OVERNIGHT_RISK_DANGER_PCT}% high-exposure threshold.`;
  }
  if (tone === "warn") {
    return `Past the ${DEFAULT_OVERNIGHT_RISK_WARN_PCT}% caution threshold.`;
  }
  return `Below the ${DEFAULT_OVERNIGHT_RISK_WARN_PCT}% caution threshold.`;
}

function ExposureBar({ pct, tone }: { pct: number; tone: Tone }) {
  const width = Math.min(100, Math.max(0, pct));

  return (
    <div>
      <div
        className="relative h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Share of account equity exposed overnight"
      >
        <div
          className={cn("h-full rounded-full transition-all", toneFill(tone))}
          style={{ width: `${width}%` }}
        />
        {[DEFAULT_OVERNIGHT_RISK_WARN_PCT, DEFAULT_OVERNIGHT_RISK_DANGER_PCT].map(
          (threshold) => (
            <span
              key={threshold}
              className="absolute inset-y-0 w-px bg-background/90"
              style={{ left: `${threshold}%` }}
              aria-hidden
            />
          )
        )}
      </div>
      <div className="relative mt-1 h-3 text-[10px] text-muted-foreground">
        <span className="absolute left-0">0%</span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${DEFAULT_OVERNIGHT_RISK_WARN_PCT}%` }}
        >
          {DEFAULT_OVERNIGHT_RISK_WARN_PCT}%
        </span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${DEFAULT_OVERNIGHT_RISK_DANGER_PCT}%` }}
        >
          {DEFAULT_OVERNIGHT_RISK_DANGER_PCT}%
        </span>
        <span className="absolute right-0">100%</span>
      </div>
    </div>
  );
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

export function OvernightRiskCard({
  summary,
  startingBalance = 0,
  currency = DEFAULT_CURRENCY,
  className,
}: {
  summary: OvernightRiskSummary;
  /** When 0, equity-based % metrics are hidden until the user sets a baseline. */
  startingBalance?: number;
  currency?: CurrencyCode;
  className?: string;
}) {
  const hasStartingBalance = startingBalance > 0;
  const tone = hasStartingBalance
    ? overnightRiskTone(summary.exposedPct)
    : ("neutral" as Tone);
  const gap = gapLabel(summary.marketGapKind);
  const largest = summary.rows[0] ?? null;

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
      meta={`${summary.rows.length} open`}
      className={className}
      footer={
        hasStartingBalance
          ? `Notional uses entry price. Caution above ${DEFAULT_OVERNIGHT_RISK_WARN_PCT}% of equity, high above ${DEFAULT_OVERNIGHT_RISK_DANGER_PCT}%.`
          : "Set your total money invested in Settings to calculate exposure as a % of account equity."
      }
      bodyClassName="flex flex-col gap-4 p-4 sm:p-5"
    >
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p
            className={cn(
              "text-2xl font-semibold",
              NUMERIC_DISPLAY_CLASS,
              hasStartingBalance ? toneText(tone) : "text-muted-foreground"
            )}
          >
            {hasStartingBalance ? (
              <>
                {summary.exposedPct.toFixed(1)}%
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  of equity
                </span>
              </>
            ) : (
              "—"
            )}
          </p>
          <p className={cn("text-sm font-semibold", NUMERIC_CLASS)}>
            {formatMoney(summary.totalExposed, false, currency)}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasStartingBalance
            ? toneSummary(tone)
            : "Entry notional at risk until total money invested is configured."}
        </p>
      </div>

      {hasStartingBalance ? (
        <ExposureBar pct={summary.exposedPct} tone={tone} />
      ) : null}

      <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-3">
        <Stat
          label="Account equity"
          value={
            hasStartingBalance
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

      <div className="-mx-4 overflow-hidden border-t border-border/60 sm:-mx-5">
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
            {summary.rows.map((row) => {
              const share = summary.totalExposed
                ? (row.notionalAtRisk / summary.totalExposed) * 100
                : 0;

              return (
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
                          style={{ width: `${share}%` }}
                        />
                      </span>
                      <span
                        className={cn(
                          "text-muted-foreground",
                          NUMERIC_CLASS
                        )}
                      >
                        {share.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </DataPanel>
  );
}
