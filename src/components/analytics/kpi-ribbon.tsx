"use client";

import { memo } from "react";
import { Info } from "lucide-react";
import {
  formatMoney,
  formatPercent,
  formatPf,
  formatSignedPercent,
  type AnalyticsKpis,
} from "@/lib/analytics";
import { useJournalMarket } from "@/components/journal/journal-market-provider";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

interface KpiRibbonProps {
  kpis: AnalyticsKpis;
  capitalBase?: number;
}

type FooterTone = "profit" | "loss" | "neutral";

function toneClass(tone: FooterTone) {
  if (tone === "profit") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "loss") return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}

function MetricHint({ title, hint }: { title: string; hint: string }) {
  return (
    <span className="group/hint relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 group-focus-within/hint:bg-muted group-focus-within/hint:text-foreground"
        aria-label={`About ${title}`}
      >
        <Info className="size-3.5" strokeWidth={2} aria-hidden />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-[min(calc(100vw-2rem),16.5rem)] -translate-x-1/2 sm:left-0 sm:translate-x-0",
          "rounded-lg border border-border/80 bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10",
          "invisible opacity-0 transition-[opacity,visibility] duration-150",
          "group-hover/hint:visible group-hover/hint:opacity-100",
          "group-focus-within/hint:visible group-focus-within/hint:opacity-100"
        )}
      >
        <span className="block text-xs font-semibold leading-snug text-foreground">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {hint}
        </span>
      </span>
    </span>
  );
}

function InsightKpiCard({
  title,
  hint,
  value,
  valueClassName,
  footer,
}: {
  title: string;
  hint: string;
  value: string;
  valueClassName?: string;
  footer?: { label: string; value: string; tone: FooterTone }[];
}) {
  return (
    <div
      className={cn(
        "flex min-h-[7.5rem] min-w-0 flex-col rounded-xl border border-border/80 bg-card px-4 py-4 shadow-sm sm:min-h-[8.5rem]",
        "ring-1 ring-foreground/[0.04] dark:ring-foreground/[0.06]"
      )}
    >
      <div className="flex items-center justify-center gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <MetricHint title={title} hint={hint} />
      </div>

      <p
        className={cn(
          "mt-3 truncate text-center text-3xl font-semibold text-foreground",
          NUMERIC_DISPLAY_CLASS,
          valueClassName
        )}
        title={value}
      >
        {value}
      </p>

      {footer && footer.length > 0 ? (
        <div className="mt-auto space-y-2 border-t border-border/80 pt-3">
          {footer.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span
                className={cn(
                  NUMERIC_DISPLAY_CLASS,
                  "font-medium",
                  toneClass(row.tone)
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const KpiRibbon = memo(function KpiRibbon({
  kpis,
  capitalBase = 0,
}: KpiRibbonProps) {
  const { activeCurrency } = useJournalMarket();
  const pnlUp = kpis.netPnl > 0;
  const pnlDown = kpis.netPnl < 0;
  const closed = kpis.wins + kpis.losses;
  const hasCapitalBase = capitalBase > 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <InsightKpiCard
        title="Net Realized P&L"
        hint="Total profit or loss from closed trades in the selected period, before fees unless recorded per trade."
        value={formatMoney(kpis.netPnl, true, activeCurrency)}
        valueClassName={
          pnlUp
            ? "text-emerald-500 dark:text-emerald-400"
            : pnlDown
              ? "text-rose-600 dark:text-rose-400"
              : undefined
        }
        footer={[
          {
            label: "Return on balance",
            value: hasCapitalBase
              ? formatSignedPercent(kpis.returnPct, 2)
              : "—",
            tone: hasCapitalBase
              ? pnlUp
                ? "profit"
                : pnlDown
                  ? "loss"
                  : "neutral"
              : "neutral",
          },
          {
            label: "Closed trades",
            value: String(closed),
            tone: "neutral",
          },
        ]}
      />

      <InsightKpiCard
        title="Profit Factor"
        hint="Gross profit divided by gross loss. Above 1.0 means winners outweigh losers in dollar terms."
        value={formatPf(kpis.profitFactor)}
        footer={[
          {
            label: "Gross profit",
            value: formatMoney(kpis.totalWinAmount, false, activeCurrency),
            tone: "profit",
          },
          {
            label: "Gross loss",
            value: formatMoney(kpis.totalLossAmount, false, activeCurrency),
            tone: "loss",
          },
        ]}
      />

      <InsightKpiCard
        title="Win Rate"
        hint="Share of closed trades marked as wins in the selected period."
        value={formatPercent(kpis.winRate, 1)}
        valueClassName={cn(
          "font-bold",
          kpis.winRate >= 55
            ? "text-emerald-600 dark:text-emerald-400"
            : kpis.winRate < 45
              ? "text-rose-600 dark:text-rose-400"
              : "text-foreground"
        )}
        footer={[
          {
            label: "Wins",
            value: String(kpis.wins),
            tone: "profit",
          },
          {
            label: "Losses",
            value: String(kpis.losses),
            tone: "loss",
          },
        ]}
      />

      <InsightKpiCard
        title="Average R:R"
        hint="Mean planned risk-to-reward ratio across trades that include an R:R value."
        value={kpis.avgRr}
        footer={[
          {
            label: "Closed trades",
            value: String(closed),
            tone: "neutral",
          },
        ]}
      />

      <InsightKpiCard
        title="Max Drawdown"
        hint="Largest peak-to-trough decline in account equity for the filtered trades."
        value={formatMoney(kpis.maxDrawdown, true, activeCurrency)}
        valueClassName="text-rose-600 dark:text-rose-400"
        footer={[
          {
            label: "Peak-to-trough",
            value: formatPercent(kpis.maxDrawdownPct, 2),
            tone: "loss",
          },
        ]}
      />
    </div>
  );
});
