"use client";

import { useMemo, useState } from "react";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { DrawdownUnderwater } from "@/components/analytics-hub/drawdown-underwater";
import { EdgePanel } from "@/components/analytics-hub/edge-panel";
import { HoldTimeBreakdown } from "@/components/analytics-hub/hold-time-breakdown";
import { InsightCards } from "@/components/analytics-hub/insight-cards";
import { PnlCalendar } from "@/components/analytics-hub/pnl-calendar";
import { RMultipleSpectrum } from "@/components/analytics-hub/r-multiple-spectrum";
import { SessionGrid } from "@/components/analytics-hub/session-grid";
import { StrategyRankings } from "@/components/analytics-hub/strategy-rankings";
import { TagRankings } from "@/components/analytics-hub/tag-rankings";
import { useSettings } from "@/components/settings/settings-provider";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import {
  computeEquitySeries,
  computeTradingInsights,
  emptyAnalyticsFilters,
  filterAnalyticsTrades,
  type AnalyticsFilters,
} from "@/lib/analytics";
import { useJournalTrades } from "@/lib/trades-storage";

export default function AnalyticsPage() {
  const { settings } = useSettings();
  const { trades } = useJournalTrades();
  const startingEquity = settings.profile.startingBalance;
  const currency = settings.profile.currency;
  const [filters, setFilters] = useState<AnalyticsFilters>(
    emptyAnalyticsFilters()
  );

  const filtered = useMemo(
    () => filterAnalyticsTrades(trades, filters),
    [trades, filters]
  );

  const insights = useMemo(
    () => computeTradingInsights(filtered, startingEquity),
    [filtered, startingEquity]
  );
  const equity = useMemo(
    () => computeEquitySeries(filtered, startingEquity),
    [filtered, startingEquity]
  );

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AnalyticsHeader
        filters={filters}
        onFiltersChange={setFilters}
        title="Analytics"
        subtitle="Deep-dive into edge, timing, risk, and strategy performance"
      />

      <InsightCards
        insights={insights}
        currency={currency}
        tradeCount={filtered.length}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PnlCalendar trades={filtered} currency={currency} />
        <DrawdownUnderwater equity={equity} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SessionGrid trades={filtered} currency={currency} />
        <RMultipleSpectrum trades={filtered} />
      </div>

      <StrategyRankings trades={filtered} currency={currency} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <HoldTimeBreakdown trades={filtered} currency={currency} />
        <EdgePanel trades={filtered} currency={currency} />
      </div>

      <TagRankings trades={filtered} currency={currency} />
    </div>
  );
}
