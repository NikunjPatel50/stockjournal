"use client";

import type { ReactNode } from "react";
import { MetricHint } from "@/components/ui/metric-hint";
import {
  AnimatedNumber,
  AnimatedPercent,
} from "@/components/ui/animated-number";
import { BookProfit } from "@/components/options/journal/book-profit";
import type {
  OptionsJournalSummary,
  OptionsPositionView,
} from "@/lib/options-journal";
import type { CurrencyCode } from "@/lib/settings";
import { APP_CARD_GRID_SURFACE_CLASS } from "@/lib/app-shell";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

function MetricCell({
  label,
  hint,
  children,
  valueClassName,
}: {
  label: string;
  hint: string;
  children: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 bg-card px-4 py-3.5 text-center sm:px-5 sm:py-4">
      <div className="flex items-center justify-center gap-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <MetricHint title={label} hint={hint} />
      </div>
      <p
        className={cn(
          "mt-1.5 text-balance text-sm font-semibold sm:text-base lg:text-lg",
          NUMERIC_DISPLAY_CLASS,
          valueClassName
        )}
      >
        {children}
      </p>
    </div>
  );
}

export function OptionsJournalMetrics({
  summary,
  positions,
  currency,
}: {
  summary: OptionsJournalSummary;
  positions: OptionsPositionView[];
  currency: CurrencyCode;
}) {
  const pf =
    summary.profitFactor === Infinity
      ? "∞"
      : summary.profitFactor.toFixed(2);

  return (
    <div
      className={cn(
        APP_CARD_GRID_SURFACE_CLASS,
        "grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,8.5rem),1fr))]"
      )}
    >
      <MetricCell
        label="Open Positions"
        hint="Active option structures still marked open in your book."
      >
        <AnimatedNumber value={summary.openCount} format={(v) => String(v)} />
      </MetricCell>
      <MetricCell
        label="Profit"
        hint="Open positions at the current underlying mark, plus closed and assigned P&L in this view."
      >
        <BookProfit positions={positions} currency={currency} />
      </MetricCell>
      <MetricCell
        label="Win Rate"
        hint="Share of closed/assigned positions with positive P&L."
      >
        <AnimatedPercent value={summary.winRate} decimals={1} signed={false} />
      </MetricCell>
      <MetricCell
        label="Profit Factor"
        hint="Gross wins divided by gross losses on closed/assigned positions."
      >
        {pf}
      </MetricCell>
      <MetricCell
        label="Avg DTE (Open)"
        hint="Days to expiration on open legs. Add expiry dates on each leg when multi-leg logging ships."
      >
        {summary.avgDte == null ? (
          "—"
        ) : (
          <AnimatedNumber
            value={summary.avgDte}
            format={(v) => `${Math.round(v)}d`}
          />
        )}
      </MetricCell>
    </div>
  );
}
