"use client";

import { MetricBand, type MetricTone } from "@/components/metric-band";
import {
  formatMoney,
  formatPercent,
  formatPf,
  formatSignedPercent,
  type AnalyticsKpis,
  type WinLossStats,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";

type MetricStripProps = {
  kpis: AnalyticsKpis;
  stats: WinLossStats;
  currency: CurrencyCode;
  capitalBase: number;
  tradeCount: number;
};

function signTone(value: number): MetricTone {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

/** Headline result band — the six numbers that define the period. */
export function MetricStrip({
  kpis,
  stats,
  currency,
  capitalBase,
  tradeCount,
}: MetricStripProps) {
  const empty = tradeCount === 0;
  const pnlTone = signTone(kpis.netPnl);

  return (
    <MetricBand
      items={[
        {
          label: "Net realized P&L",
          value: formatMoney(kpis.netPnl, true, currency),
          detail: `${tradeCount} closed trade${tradeCount === 1 ? "" : "s"}`,
          tone: pnlTone,
        },
        {
          label: "Return on capital",
          value:
            capitalBase > 0
              ? formatSignedPercent(kpis.returnPct, 2)
              : "—",
          detail:
            capitalBase > 0
              ? `Base ${formatMoney(capitalBase, false, currency)}`
              : "Add trades to calculate",
          tone: capitalBase > 0 ? pnlTone : "neutral",
        },
        {
          label: "Win rate",
          value: empty ? "—" : formatPercent(kpis.winRate),
          detail: `${kpis.wins}W · ${kpis.losses}L`,
          tone: empty ? "neutral" : kpis.winRate >= 50 ? "positive" : "negative",
        },
        {
          label: "Profit factor",
          value: empty ? "—" : formatPf(kpis.profitFactor),
          detail: `Gross ${formatMoney(kpis.totalWinAmount, false, currency)} / ${formatMoney(kpis.totalLossAmount, false, currency)}`,
          tone: empty
            ? "neutral"
            : kpis.profitFactor >= 1
              ? "positive"
              : "negative",
        },
        {
          label: "Expectancy",
          value: empty ? "—" : formatMoney(stats.expectancy, true, currency),
          detail: "Expected value per trade",
          tone: empty ? "neutral" : signTone(stats.expectancy),
        },
        {
          label: "Max drawdown",
          value: formatMoney(kpis.maxDrawdown, true, currency),
          detail: `${formatPercent(kpis.maxDrawdownPct, 2)} peak-to-trough`,
          tone: kpis.maxDrawdown < 0 ? "negative" : "neutral",
        },
      ]}
    />
  );
}
