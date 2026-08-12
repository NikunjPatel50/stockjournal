"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { PnlBreakdownCard } from "@/components/analytics/pnl-breakdown-card";
import { RecentTradesCard } from "@/components/analytics/recent-trades-card";
import { KpiRibbon } from "@/components/analytics/kpi-ribbon";
import { PortfolioSummaryStrip } from "@/components/analytics/portfolio-summary-strip";
import {
  computeWeeklyPnl,
  computeEquitySeries,
  computeKpisFromEquity,
  emptyAnalyticsFilters,
  filterAnalyticsTrades,
  type AnalyticsFilters,
} from "@/lib/analytics";
import { useRegionTrades } from "@/components/journal/journal-market-provider";
import { computeCapitalBase, computeOvernightRisk } from "@/lib/overnight-risk";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { LazySection } from "@/components/lazy-section";

const TradePulseSection = dynamic(
  () =>
    import("@/components/trade-pulse/trade-pulse-section").then((mod) => ({
      default: mod.TradePulseSection,
    })),
  { loading: () => <div className="min-h-[8rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const MainCharts = dynamic(
  () =>
    import("@/components/analytics/main-charts").then((mod) => ({
      default: mod.MainCharts,
    })),
  { loading: () => <div className="min-h-[16rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const OvernightRiskCard = dynamic(
  () =>
    import("@/components/analytics/overnight-risk-card").then((mod) => ({
      default: mod.OvernightRiskCard,
    })),
  { loading: () => <div className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const MonthlyPerformanceCard = dynamic(
  () =>
    import("@/components/analytics/monthly-performance-card").then((mod) => ({
      default: mod.MonthlyPerformanceCard,
    })),
  { loading: () => <div className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40" /> }
);

const PortfolioOverviewCard = dynamic(
  () =>
    import("@/components/analytics/portfolio-overview-card").then((mod) => ({
      default: mod.PortfolioOverviewCard,
    })),
  { loading: () => <div className="min-h-[18rem] animate-pulse rounded-2xl bg-muted/40" /> }
);

export default function DashboardPage() {
  const { trades, currency } = useRegionTrades();
  const capitalBase = useMemo(() => computeCapitalBase(trades), [trades]);
  const [filters, setFilters] = useState<AnalyticsFilters>(
    emptyAnalyticsFilters()
  );

  const filtered = useMemo(
    () => filterAnalyticsTrades(trades, filters),
    [trades, filters]
  );

  const equity = useMemo(
    () => computeEquitySeries(filtered, capitalBase),
    [filtered, capitalBase]
  );
  const kpis = useMemo(
    () => computeKpisFromEquity(filtered, capitalBase, equity),
    [filtered, capitalBase, equity]
  );
  const weeklyPnl = useMemo(() => computeWeeklyPnl(filtered), [filtered]);
  const overnightRisk = useMemo(
    () => computeOvernightRisk(trades),
    [trades]
  );

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AnalyticsHeader
        filters={filters}
        onFiltersChange={setFilters}
        title="Dashboard"
      />
      <KpiRibbon kpis={kpis} capitalBase={capitalBase} />

      <PortfolioSummaryStrip trades={trades} currency={currency} />

      <PortfolioOverviewCard trades={trades} currency={currency} />

      <LazySection minHeight="8rem">
        <TradePulseSection />
      </LazySection>

      <LazySection minHeight="12rem">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          <OvernightRiskCard
            summary={overnightRisk}
            currency={currency}
            className="h-full"
          />
          <MonthlyPerformanceCard
            trades={filtered}
            startingEquity={capitalBase}
          />
        </div>
      </LazySection>

      <LazySection minHeight="16rem">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
          <MainCharts equity={equity} weeklyPnl={weeklyPnl} />
          <PnlBreakdownCard trades={filtered} />
        </div>
      </LazySection>

      <LazySection minHeight="12rem">
        <RecentTradesCard trades={filtered} currency={currency} />
      </LazySection>
    </div>
  );
}
