"use client";

import { Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DEFAULT_OVERNIGHT_RISK_DANGER_PCT,
  DEFAULT_OVERNIGHT_RISK_WARN_PCT,
  overnightRiskTone,
  type OvernightRiskSummary,
} from "@/lib/overnight-risk";
import { formatMoney } from "@/lib/analytics";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const cardShell = cn(
  "rounded-xl border border-border px-4 py-4 sm:px-5 sm:py-5",
  "bg-gradient-to-b from-card to-muted/45",
  "shadow-sm ring-1 ring-foreground/[0.06]",
  "dark:from-slate-900 dark:to-slate-950/90 dark:border-slate-700/90"
);

function gapRiskLabel(kind: OvernightRiskSummary["marketGapKind"]) {
  if (kind === "weekend") return "Weekend";
  if (kind === "holiday") return "Holiday";
  return "Overnight";
}

function RiskIcon({
  tone,
  marketGapKind,
}: {
  tone: ReturnType<typeof overnightRiskTone>;
  marketGapKind: OvernightRiskSummary["marketGapKind"];
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md",
        tone === "danger"
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : tone === "warn"
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      )}
    >
      {marketGapKind === "weekend" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </span>
  );
}

export function OvernightRiskCard({
  summary,
  className,
}: {
  summary: OvernightRiskSummary;
  className?: string;
}) {
  const tone = overnightRiskTone(summary.exposedPct);
  const barPct = Math.min(100, summary.exposedPct);

  const barClass =
    tone === "danger"
      ? "[&>div]:bg-rose-500"
      : tone === "warn"
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-emerald-500";

  if (summary.rows.length === 0) {
    return (
      <div className={cn(cardShell, "max-w-3xl", className)}>
        <div className="flex items-center gap-2.5">
          <RiskIcon tone="safe" marketGapKind="overnight" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Overnight / weekend exposure
            </h2>
            <p className="text-xs text-muted-foreground">
              No open positions — no overnight exposure.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        cardShell,
        "flex h-full max-w-3xl flex-col",
        className
      )}
    >
      <div className="flex gap-3">
        <RiskIcon tone={tone} marketGapKind={summary.marketGapKind} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Overnight / weekend exposure
            </h2>
            <Badge variant="outline" className="h-5 border-border px-1.5 text-[10px]">
              {gapRiskLabel(summary.marketGapKind)} gap
            </Badge>
            <span className={cn("text-sm font-semibold text-foreground", NUMERIC_CLASS)}>
              {formatMoney(summary.totalExposed)}
              <span className="font-normal text-muted-foreground">
                {" "}
                ({summary.exposedPct.toFixed(1)}%)
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Progress
              value={barPct}
              className={cn("h-2 min-w-0 flex-1", barClass)}
            />
            <span
              className="shrink-0 text-[10px] text-muted-foreground"
              title={`Warn ${DEFAULT_OVERNIGHT_RISK_WARN_PCT}% · High ${DEFAULT_OVERNIGHT_RISK_DANGER_PCT}%`}
            >
              {summary.exposedPct.toFixed(0)}%
            </span>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Equity {formatMoney(summary.accountEquity)} · {summary.rows.length}{" "}
            open · entry notional
          </p>
        </div>
      </div>

      <ScrollArea className="mt-3.5 min-h-[7.5rem] max-h-[8.5rem] flex-1 rounded-lg border border-border/80 bg-background/50 lg:max-h-none">
        <ul className="divide-y divide-border/80">
          {summary.rows.map((row) => (
            <li
              key={row.tradeId}
              className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs sm:text-[13px]"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className={cn("font-semibold text-foreground", NUMERIC_CLASS)}>
                  {row.ticker}
                </span>
                {row.gapRisk === "weekend" ? (
                  <Badge className="h-4 bg-amber-500/15 px-1 text-[9px] text-amber-700 dark:text-amber-300">
                    Weekend
                  </Badge>
                ) : row.gapRisk === "holiday" ? (
                  <Badge className="h-4 bg-orange-500/15 px-1 text-[9px] text-orange-700 dark:text-orange-300">
                    Holiday
                  </Badge>
                ) : null}
              </div>
              <span className={cn("shrink-0 text-[11px] text-muted-foreground", NUMERIC_CLASS)}>
                {row.quantity}@{row.priceUsed.toFixed(0)}{" "}
                <span className="font-medium text-foreground">
                  {formatMoney(row.notionalAtRisk, false)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
