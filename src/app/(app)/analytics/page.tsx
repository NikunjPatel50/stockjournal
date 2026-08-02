"use client";

import { useMemo, useState } from "react";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { DrawdownUnderwater } from "@/components/analytics-hub/drawdown-underwater";
import { EdgePanel } from "@/components/analytics-hub/edge-panel";
import { HoldTimeBreakdown } from "@/components/analytics-hub/hold-time-breakdown";
import { InsightCards } from "@/components/analytics-hub/insight-cards";
import { MetricStrip } from "@/components/analytics-hub/metric-strip";
import { PnlCalendar } from "@/components/analytics-hub/pnl-calendar";
import { ReportSection } from "@/components/analytics-hub/report-section";
import { PanelEmpty } from "@/components/data-panel";
import { RMultipleSpectrum } from "@/components/analytics-hub/r-multiple-spectrum";
import { SessionGrid } from "@/components/analytics-hub/session-grid";
import { TagRankings } from "@/components/analytics-hub/tag-rankings";
import { useSettings } from "@/components/settings/settings-provider";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import {
  analyticsPeriodBadge,
  computeEquitySeries,
  computeKpis,
  computeTradingInsights,
  computeWinLossStats,
  emptyAnalyticsFilters,
  filterAnalyticsTrades,
  type AnalyticsFilters,
} from "@/lib/analytics";
import { useJournalTrades } from "@/lib/trades-storage";

const GRID_CLASS = "grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch";

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

  const kpis = useMemo(
    () => computeKpis(filtered, startingEquity),
    [filtered, startingEquity]
  );
  const winLoss = useMemo(() => computeWinLossStats(filtered), [filtered]);
  const insights = useMemo(
    () => computeTradingInsights(filtered, startingEquity),
    [filtered, startingEquity]
  );
  const equity = useMemo(
    () => computeEquitySeries(filtered, startingEquity),
    [filtered, startingEquity]
  );

  const activeCount = useMemo(
    () => trades.filter((trade) => trade.status === "Active").length,
    [trades]
  );
  const period = analyticsPeriodBadge(filters);

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AnalyticsHeader
        filters={filters}
        onFiltersChange={setFilters}
        title="Analytics"
        subtitle="Deep-dive into edge, timing, risk, and strategy performance"
      />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>
          Period{" "}
          <span className="font-medium text-foreground">{period}</span>
        </span>
        <span aria-hidden>·</span>
        <span>
          Closed trades{" "}
          <span className="font-medium text-foreground">{filtered.length}</span>
        </span>
        <span aria-hidden>·</span>
        <span>
          Open positions{" "}
          <span className="font-medium text-foreground">{activeCount}</span>
        </span>
        <span aria-hidden>·</span>
        <span>Realized results only — open positions are excluded</span>
      </div>

      <MetricStrip
        kpis={kpis}
        stats={winLoss}
        currency={currency}
        startingEquity={startingEquity}
        tradeCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <PanelEmpty
          className="min-h-[16rem] bg-card/60"
          title="No closed trades in this period"
          hint="Analytics are built from realized results. Close a trade in the journal, or widen the timeframe above, to populate this report."
        />
      ) : (
        <>
          <ReportSection
            index="01"
            title="Signals"
            description="Derived read-outs on edge, consistency, and behavior"
          >
            <InsightCards
              insights={insights}
              currency={currency}
              tradeCount={filtered.length}
            />
          </ReportSection>

          <ReportSection
            index="02"
            title="Performance"
            description="Realized results and distance from the equity peak"
          >
            <div className={GRID_CLASS}>
              <PnlCalendar trades={filtered} currency={currency} />
              <DrawdownUnderwater equity={equity} />
            </div>
          </ReportSection>

          <ReportSection
            index="03"
            title="Risk and outcome sizing"
            description="How results scale against planned risk"
          >
            <div className={GRID_CLASS}>
              <RMultipleSpectrum trades={filtered} />
              <EdgePanel trades={filtered} currency={currency} />
            </div>
          </ReportSection>

          <ReportSection
            index="04"
            title="Attribution"
            description="Which labels and durations produced the P&L"
          >
            <div className={GRID_CLASS}>
              <TagRankings trades={filtered} currency={currency} />
              <HoldTimeBreakdown trades={filtered} currency={currency} />
            </div>
          </ReportSection>

          <ReportSection
            index="05"
            title="Timing"
            description="Weekday and session concentration of results"
          >
            <SessionGrid trades={filtered} currency={currency} />
          </ReportSection>
        </>
      )}
    </div>
  );
}
