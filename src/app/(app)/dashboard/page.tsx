"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { OvernightRiskCard } from "@/components/analytics/overnight-risk-card";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { MonthlyPerformanceCard } from "@/components/analytics/monthly-performance-card";
import { PnlBreakdownCard } from "@/components/analytics/pnl-breakdown-card";
import { RecentTradesCard } from "@/components/analytics/recent-trades-card";
import { KpiRibbon } from "@/components/analytics/kpi-ribbon";
import { useSettings } from "@/components/settings/settings-provider";
import {
  computeWeeklyPnl,
  computeEquitySeries,
  computeKpis,
  emptyAnalyticsFilters,
  filterAnalyticsTrades,
  type AnalyticsFilters,
} from "@/lib/analytics";
import { useJournalTrades } from "@/lib/trades-storage";
import { computeOvernightRisk } from "@/lib/overnight-risk";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";

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

export default function DashboardPage() {
  const { settings } = useSettings();
  const { trades } = useJournalTrades();
  const startingEquity = settings.profile.startingBalance;
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
  const equity = useMemo(
    () => computeEquitySeries(filtered, startingEquity),
    [filtered, startingEquity]
  );
  const weeklyPnl = useMemo(() => computeWeeklyPnl(filtered), [filtered]);
  const overnightRisk = useMemo(
    () => computeOvernightRisk(trades, startingEquity),
    [trades, startingEquity]
  );

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <AnalyticsHeader
        filters={filters}
        onFiltersChange={setFilters}
        title="Dashboard"
      />
      <KpiRibbon kpis={kpis} startingEquity={startingEquity} />

      <TradePulseSection />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        <OvernightRiskCard
          summary={overnightRisk}
          startingBalance={startingEquity}
          currency={settings.profile.currency}
          className="h-full"
        />
        <MonthlyPerformanceCard
          trades={filtered}
          startingEquity={startingEquity}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
        <MainCharts equity={equity} weeklyPnl={weeklyPnl} />
        <PnlBreakdownCard trades={filtered} />
      </div>

      <RecentTradesCard trades={filtered} currency={settings.profile.currency} />
    </div>
  );
}
