"use client";

import { useMemo, useState } from "react";
import { OvernightRiskCard } from "@/components/analytics/overnight-risk-card";
import { AnalyticsHeader } from "@/components/analytics/analytics-header";
import { MonthlyPerformanceCard } from "@/components/analytics/monthly-performance-card";
import { PnlBreakdownCard } from "@/components/analytics/pnl-breakdown-card";
import { RecentTradesCard } from "@/components/analytics/recent-trades-card";
import { KpiRibbon } from "@/components/analytics/kpi-ribbon";
import { MainCharts } from "@/components/analytics/main-charts";
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
