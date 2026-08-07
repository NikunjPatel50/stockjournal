"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { MetricStrip } from "@/components/analytics-hub/metric-strip";
import { ReportSection } from "@/components/analytics-hub/report-section";
import { PanelEmpty } from "@/components/data-panel";
import { useSettings } from "@/components/settings/settings-provider";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { LazySection } from "@/components/lazy-section";
import {
  analyticsPeriodBadge,
  computeKpis,
  computeWinLossStats,
  emptyAnalyticsFilters,
  filterAnalyticsTrades,
  type AnalyticsFilters,
} from "@/lib/analytics";
import { useJournalTrades } from "@/components/journal-trades-provider";
import { computeCapitalBase } from "@/lib/overnight-risk";

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

const PnlLineChart = dynamic(
  () =>
    import("@/components/analytics-hub/pnl-calendar").then((mod) => ({
      default: mod.PnlLineChart,
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

const SessionGrid = dynamic(
  () =>
    import("@/components/analytics-hub/session-grid").then((mod) => ({
      default: mod.SessionGrid,
    })),
  { loading: () => <div className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40" /> }
);

export default function AnalyticsPage() {
  const { settings } = useSettings();
  const { trades } = useJournalTrades();
  const capitalBase = useMemo(() => computeCapitalBase(trades), [trades]);
  const currency = settings.profile.currency;
  const [filters, setFilters] = useState<AnalyticsFilters>(
    emptyAnalyticsFilters()
  );

  const filtered = useMemo(
    () => filterAnalyticsTrades(trades, filters),
    [trades, filters]
  );


  const kpis = useMemo(
    () => computeKpis(filtered, capitalBase),
    [filtered, capitalBase]
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

      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
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
        <span className="hidden sm:inline" aria-hidden>
          ·
        </span>
        <span className="sm:inline">Realized results only — open positions are excluded</span>
      </div>

      <MetricStrip
        kpis={kpis}
        stats={winLoss}
        currency={currency}
        capitalBase={capitalBase}
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
              description="Realized P&L trend and open-position performance"
            >
              <div className={GRID_CLASS}>
                <PnlChartCard trades={trades} currency={currency} />
              </div>
            </ReportSection>
          ) : null}
        </>
      ) : (
        <>
          <LazySection minHeight="16rem">
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
          </LazySection>

          <LazySection minHeight="18rem">
            <ReportSection
              index="02"
              title="Performance"
              description="Realized P&L trend and open-position performance"
            >
              <div className={GRID_CLASS}>
                <PnlLineChart trades={filtered} currency={currency} />
                <PnlChartCard trades={trades} currency={currency} />
              </div>
            </ReportSection>
          </LazySection>

          <LazySection minHeight="16rem">
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
          </LazySection>

          <LazySection minHeight="16rem">
            <ReportSection
              index="04"
              title="Timing and duration"
              description="When you trade during the week and how long positions are held"
            >
              <div className={GRID_CLASS}>
                <SessionGrid trades={filtered} currency={currency} />
                <HoldTimeBreakdown trades={filtered} currency={currency} />
              </div>
            </ReportSection>
          </LazySection>
        </>
      )}
    </div>
  );
}
