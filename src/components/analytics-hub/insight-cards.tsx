"use client";

import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  formatMoney,
  formatPercent,
  type TradingInsights,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type InsightCardsProps = {
  insights: TradingInsights;
  currency: CurrencyCode;
  tradeCount: number;
};

type SignalStatus = "positive" | "negative" | "watch" | "unavailable";

type Signal = {
  label: string;
  value: string;
  detail: string;
  status: SignalStatus;
};

type SignalGroup = {
  heading: string;
  signals: Signal[];
};

const statusDot: Record<SignalStatus, string> = {
  positive: "bg-emerald-500",
  negative: "bg-rose-500",
  watch: "bg-amber-500",
  unavailable: "bg-transparent ring-1 ring-inset ring-border",
};

const statusValue: Record<SignalStatus, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-rose-600 dark:text-rose-400",
  watch: "text-amber-600 dark:text-amber-400",
  unavailable: "text-muted-foreground",
};

function SignalRow({ signal }: { signal: Signal }) {
  return (
    <li className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
      <span
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          statusDot[signal.status]
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-xs font-medium text-foreground">
            {signal.label}
          </p>
          <p
            className={cn(
              "shrink-0 text-sm font-semibold",
              NUMERIC_CLASS,
              statusValue[signal.status]
            )}
          >
            {signal.value}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {signal.detail}
        </p>
      </div>
    </li>
  );
}

function buildGroups(
  insights: TradingInsights,
  currency: CurrencyCode
): SignalGroup[] {
  const cushion = insights.winRateCushion;
  const winRateCushion: Signal = {
    label: "Win-rate cushion",
    value:
      cushion == null
        ? "—"
        : cushion >= 0
          ? `+${formatPercent(cushion)}`
          : formatPercent(cushion),
    detail:
      cushion == null
        ? "Needs both wins and losses to derive a breakeven rate."
        : cushion >= 0
          ? `Winning ${formatPercent(insights.actualWinRate)} against a ${formatPercent(insights.breakEvenWinRate!)} breakeven.`
          : `Running ${formatPercent(Math.abs(cushion))} under breakeven — raise payoff or accuracy.`,
    status: cushion == null ? "unavailable" : cushion >= 0 ? "positive" : "negative",
  };

  const rTarget: Signal = {
    label: "1R+ hit rate",
    value:
      insights.rTargetHitRate != null
        ? formatPercent(insights.rTargetHitRate)
        : "—",
    detail:
      insights.rTargetHitRate != null
        ? "Share of risk-defined trades that returned at least 1R."
        : "Record planned risk on trades to measure R outcomes.",
    status:
      insights.rTargetHitRate == null
        ? "unavailable"
        : insights.rTargetHitRate >= 40
          ? "positive"
          : "watch",
  };

  const concentration: Signal = {
    label: "Profit concentration",
    value:
      insights.profitConcentrationPct != null
        ? formatPercent(insights.profitConcentrationPct)
        : "—",
    detail:
      insights.topProfitTicker && insights.profitConcentrationPct != null
        ? `${insights.topProfitTicker} accounts for this share of gross profit.`
        : "No winning trades to attribute profit against.",
    status:
      insights.profitConcentrationPct == null
        ? "unavailable"
        : insights.profitConcentrationPct >= 50
          ? "watch"
          : "positive",
  };

  const greenDays: Signal = {
    label: "Green day rate",
    value: insights.tradingDays > 0 ? formatPercent(insights.greenDayRate) : "—",
    detail:
      insights.tradingDays > 0
        ? `${insights.greenDays} of ${insights.tradingDays} trading days closed positive.`
        : "No daily P&L recorded in this period.",
    status:
      insights.tradingDays === 0
        ? "unavailable"
        : insights.greenDayRate >= 50
          ? "positive"
          : "watch",
  };

  const recovery: Signal = {
    label: "Recovery factor",
    value:
      insights.recoveryFactor == null
        ? "—"
        : `${insights.recoveryFactor.toFixed(2)}×`,
    detail:
      insights.recoveryFactor == null
        ? "No drawdown recorded, so recovery is undefined."
        : insights.recoveryFactor >= 1
          ? "Net profit exceeds the deepest drawdown."
          : "Net profit has not yet covered the deepest drawdown.",
    status:
      insights.recoveryFactor == null
        ? "unavailable"
        : insights.recoveryFactor >= 1
          ? "positive"
          : "negative",
  };

  const weekday: Signal = {
    label: "Strongest weekday",
    value: insights.bestWeekday?.day ?? "—",
    detail: insights.bestWeekday
      ? `${formatMoney(insights.bestWeekday.pnl, true, currency)} cumulative P&L on this day.`
      : "Not enough weekday coverage to rank.",
    status: insights.bestWeekday
      ? insights.bestWeekday.pnl > 0
        ? "positive"
        : "negative"
      : "unavailable",
  };

  const hold: Signal = {
    label: "Sweet-spot hold",
    value: insights.sweetSpotHold?.replace(/\s*\(.*/, "") ?? "—",
    detail: insights.sweetSpotHold
      ? `${insights.sweetSpotHold} is the most profitable duration bucket.`
      : "Hold-time profile needs more closed trades.",
    status: insights.sweetSpotHold ? "positive" : "unavailable",
  };

  const tilt: Signal = {
    label: "Post-win tilt",
    value:
      insights.lossAfterWinRate != null
        ? formatPercent(insights.lossAfterWinRate)
        : "—",
    detail:
      insights.lossAfterWinRate != null
        ? insights.lossAfterWinRate >= 50
          ? "Most losses arrive straight after a win — watch for over-sizing."
          : "Losses rarely follow wins, suggesting a clean reset."
        : "Needs more losing trades to measure sequencing.",
    status:
      insights.lossAfterWinRate == null
        ? "unavailable"
        : insights.lossAfterWinRate >= 50
          ? "negative"
          : "positive",
  };

  const riskCoverage: Signal = {
    label: "Risk-plan coverage",
    value: formatPercent(insights.plannedRiskRate),
    detail:
      insights.plannedRiskRate >= 80
        ? "Nearly every trade has planned risk recorded."
        : "Add planned risk to more trades to unlock R-based analytics.",
    status: insights.plannedRiskRate >= 80 ? "positive" : "watch",
  };

  return [
    { heading: "Edge quality", signals: [winRateCushion, rTarget, concentration] },
    { heading: "Consistency", signals: [greenDays, recovery, weekday] },
    { heading: "Behavior", signals: [hold, tilt, riskCoverage] },
  ];
}

export function InsightCards({
  insights,
  currency,
  tradeCount,
}: InsightCardsProps) {
  if (tradeCount === 0) {
    return (
      <DataPanel
        title="Diagnostic signals"
        subtitle="Derived read-outs on edge, consistency, and behavior"
      >
        <PanelEmpty
          title="No closed trades in this period"
          hint="Close a trade in the journal to generate diagnostic read-outs."
        />
      </DataPanel>
    );
  }

  const groups = buildGroups(insights, currency);
  const available = groups
    .flatMap((g) => g.signals)
    .filter((s) => s.status !== "unavailable").length;
  const total = groups.reduce((sum, g) => sum + g.signals.length, 0);

  return (
    <DataPanel
      title="Diagnostic signals"
      subtitle="Derived read-outs on edge, consistency, and behavior"
      meta={`${available}/${total} available`}
      flush
      footer={
        <span>
          Based on {tradeCount} closed trade{tradeCount === 1 ? "" : "s"}. Hollow
          markers indicate signals without enough data yet.
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-px bg-border/70 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.heading} className="bg-card px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {group.heading}
            </p>
            <ul className="mt-3 divide-y divide-border/60">
              {group.signals.map((signal) => (
                <SignalRow key={signal.label} signal={signal} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DataPanel>
  );
}
