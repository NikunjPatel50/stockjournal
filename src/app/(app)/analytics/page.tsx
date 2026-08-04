"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { MetricStrip } from "@/components/analytics-hub/metric-strip";
import { ReportSection } from "@/components/analytics-hub/report-section";
import { PanelEmpty } from "@/components/data-panel";
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

const PerformanceBreakdownCards = dynamic(
  () =>
    import("@/components/analytics-hub/performance-breakdown-cards").then(
      (mod) => ({ default: mod.PerformanceBreakdownCards })
    ),
  { loading: () => <div className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const PnlChartCard = dynamic(
  () =>
    import("@/components/analytics-hub/pnl-chart-card").then((mod) => ({
      default: mod.PnlChartCard,
    })),
  { loading: () => <div className="min-h-[16rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const PnlCalendar = dynamic(
  () =>
    import("@/components/analytics-hub/pnl-calendar").then((mod) => ({
      default: mod.PnlCalendar,
    })),
  { loading: () => <div className="min-h-[16rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const EdgePanel = dynamic(
  () =>
    import("@/components/analytics-hub/edge-panel").then((mod) => ({
      default: mod.EdgePanel,
    })),
  { loading: () => <div className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const HoldTimeBreakdown = dynamic(
  () =>
    import("@/components/analytics-hub/hold-time-breakdown").then((mod) => ({
      default: mod.HoldTimeBreakdown,
    })),
  { loading: () => <div className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const RMultipleSpectrum = dynamic(
  () =>
    import("@/components/analytics-hub/r-multiple-spectrum").then((mod) => ({
      default: mod.RMultipleSpectrum,
    })),
  { loading: () => <div className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const TagRankings = dynamic(
  () =>
    import("@/components/analytics-hub/tag-rankings").then((mod) => ({
      default: mod.TagRankings,
    })),
  { loading: () => <div className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40" /> }
);

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
