"use client";

import { useMemo, useState } from "react";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { PnlChartCard } from "@/components/analytics-hub/pnl-chart-card";
import { EdgePanel } from "@/components/analytics-hub/edge-panel";
import { HoldTimeBreakdown } from "@/components/analytics-hub/hold-time-breakdown";
import { PerformanceBreakdownCards } from "@/components/analytics-hub/performance-breakdown-cards";
import { MetricStrip } from "@/components/analytics-hub/metric-strip";
import { PnlCalendar } from "@/components/analytics-hub/pnl-calendar";
import { ReportSection } from "@/components/analytics-hub/report-section";
import { PanelEmpty } from "@/components/data-panel";
import { RMultipleSpectrum } from "@/components/analytics-hub/r-multiple-spectrum";
import { TagRankings } from "@/components/analytics-hub/tag-rankings";
import { useSettings } from "@/components/settings/settings-provider";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import {
  analyticsPeriodBadge,
  computeKpis,
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
        <>
          <PanelEmpty
            className="min-h-[16rem] bg-card/60"
            title="No closed trades in this period"
            hint="Analytics are built from realized results. Close a trade in the journal, or widen the timeframe above, to populate this report."
          />
          {activeCount > 0 ? (
            <ReportSection
              index="02"
              title="Performance"
              description="Daily P&L rhythm and period performance"
            >
              <div className={GRID_CLASS}>
                <PnlChartCard trades={trades} currency={currency} />
              </div>
            </ReportSection>
          ) : null}
        </>
      ) : (
        <>
          <ReportSection
            index="01"
            title="Attribution"
            description="How results cluster by sector and company size"
          >
            <PerformanceBreakdownCards
              trades={filtered}
              currency={currency}
            />
          </ReportSection>

          <ReportSection
            index="02"
            title="Performance"
            description="Daily P&L rhythm and period performance"
          >
            <div className={GRID_CLASS}>
              <PnlCalendar trades={filtered} currency={currency} />
              <PnlChartCard trades={trades} currency={currency} />
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
            title="Labels and duration"
            description="Which tags and hold times produced the P&L"
          >
            <div className={GRID_CLASS}>
              <TagRankings trades={filtered} currency={currency} />
              <HoldTimeBreakdown trades={filtered} currency={currency} />
            </div>
          </ReportSection>
        </>
      )}
    </div>
  );
}
