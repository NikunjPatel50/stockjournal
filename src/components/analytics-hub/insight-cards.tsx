"use client";

import {
  CalendarCheck,
  Crosshair,
  Layers,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
} from "lucide-react";
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

type InsightCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  detail: string;
  accent?: "violet" | "emerald" | "amber" | "sky" | "rose" | "slate";
};

const accentStyles = {
  violet: {
    border: "border-violet-500/25",
    bg: "bg-violet-500/[0.06]",
    icon: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/10",
  },
  emerald: {
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/[0.06]",
    icon: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/10",
  },
  amber: {
    border: "border-amber-500/25",
    bg: "bg-amber-500/[0.06]",
    icon: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/10",
  },
  sky: {
    border: "border-sky-500/25",
    bg: "bg-sky-500/[0.06]",
    icon: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/10",
  },
  rose: {
    border: "border-rose-500/25",
    bg: "bg-rose-500/[0.06]",
    icon: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/10",
  },
  slate: {
    border: "border-border/70",
    bg: "bg-muted/20",
    icon: "text-muted-foreground",
    ring: "ring-border/40",
  },
} as const;

function InsightCard({
  icon: Icon,
  title,
  value,
  detail,
  accent = "slate",
}: InsightCardProps) {
  const style = accentStyles[accent];

  return (
    <article
      className={cn(
        "flex min-h-[8.5rem] flex-col justify-between rounded-2xl border p-4 shadow-sm ring-1",
        style.border,
        style.bg,
        style.ring
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg bg-background/80",
            style.icon
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="mt-3">
        <p
          className={cn(
            "text-xl font-bold tracking-tight text-foreground sm:text-2xl",
            NUMERIC_CLASS
          )}
        >
          {value}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {detail}
        </p>
      </div>
    </article>
  );
}

export function InsightCards({
  insights,
  currency,
  tradeCount,
}: InsightCardsProps) {
  if (tradeCount === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No closed trades yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Close a few trades to unlock personalized insights.
        </p>
      </section>
    );
  }

  const cushion = insights.winRateCushion;
  const cushionValue =
    cushion == null
      ? "—"
      : cushion >= 0
        ? `+${formatPercent(cushion)}`
        : formatPercent(cushion);
  const cushionDetail =
    cushion == null
      ? "Need both wins and losses to calculate your breakeven edge."
      : cushion >= 0
        ? `Win rate is ${formatPercent(insights.actualWinRate)} vs ${formatPercent(insights.breakEvenWinRate!)} needed to break even.`
        : `You're ${formatPercent(Math.abs(cushion))} below breakeven — improve payoff or win rate.`;

  const greenDetail =
    insights.tradingDays > 0
      ? `${insights.greenDays} of ${insights.tradingDays} trading days ended green.`
      : "No daily P&L data in this range.";

  const recoveryValue =
    insights.recoveryFactor == null
      ? "—"
      : `${insights.recoveryFactor.toFixed(2)}×`;
  const recoveryDetail =
    insights.recoveryFactor == null
      ? "No drawdown recorded in this period."
      : insights.recoveryFactor >= 1
        ? "Net profit exceeds your deepest drawdown — strong recovery."
        : "Still digging out of max drawdown — size down until positive.";

  const weekdayValue = insights.bestWeekday?.day ?? "—";
  const weekdayDetail = insights.bestWeekday
    ? `Best weekday: ${formatMoney(insights.bestWeekday.pnl, true, currency)} total P&L.`
    : "Not enough weekday data yet.";

  const concentrationValue =
    insights.profitConcentrationPct != null
      ? formatPercent(insights.profitConcentrationPct)
      : "—";
  const concentrationDetail =
    insights.topProfitTicker && insights.profitConcentrationPct != null
      ? `${insights.profitConcentrationPct >= 50 ? "Heavy" : "Moderate"} reliance on ${insights.topProfitTicker} for profits.`
      : "No winning trades to analyze concentration.";

  const rTargetValue =
    insights.rTargetHitRate != null
      ? formatPercent(insights.rTargetHitRate)
      : "—";
  const rTargetDetail =
    insights.rTargetHitRate != null
      ? `${formatPercent(insights.plannedRiskRate)} of trades have planned risk defined.`
      : "Add planned risk on trades to track 1R+ hit rate.";

  const holdValue = insights.sweetSpotHold?.replace(/\s*\(.*/, "") ?? "—";
  const holdDetail = insights.sweetSpotHold
    ? `${insights.sweetSpotHold} is your most profitable hold-time bucket.`
    : "Hold-time profile needs more trades.";

  const tiltValue =
    insights.lossAfterWinRate != null
      ? formatPercent(insights.lossAfterWinRate)
      : "—";
  const tiltDetail =
    insights.lossAfterWinRate != null
      ? insights.lossAfterWinRate >= 50
        ? "Many losses follow wins — watch for revenge trading."
        : "Losses rarely follow wins — good emotional reset."
      : "Need more losses to measure post-win tilt.";

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Trading insights
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Patterns and edges from {tradeCount} closed trade
            {tradeCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <InsightCard
          icon={Sparkles}
          title="Win-rate cushion"
          value={cushionValue}
          detail={cushionDetail}
          accent={
            cushion == null ? "slate" : cushion >= 0 ? "emerald" : "rose"
          }
        />
        <InsightCard
          icon={CalendarCheck}
          title="Green day rate"
          value={formatPercent(insights.greenDayRate)}
          detail={greenDetail}
          accent={insights.greenDayRate >= 50 ? "emerald" : "amber"}
        />
        <InsightCard
          icon={TrendingUp}
          title="Recovery factor"
          value={recoveryValue}
          detail={recoveryDetail}
          accent={
            insights.recoveryFactor != null && insights.recoveryFactor >= 1
              ? "emerald"
              : "sky"
          }
        />
        <InsightCard
          icon={Layers}
          title="Profit concentration"
          value={concentrationValue}
          detail={concentrationDetail}
          accent={
            insights.profitConcentrationPct != null &&
            insights.profitConcentrationPct >= 50
              ? "amber"
              : "violet"
          }
        />
        <InsightCard
          icon={Crosshair}
          title="1R+ hit rate"
          value={rTargetValue}
          detail={rTargetDetail}
          accent="violet"
        />
        <InsightCard
          icon={Timer}
          title="Sweet-spot hold"
          value={holdValue}
          detail={holdDetail}
          accent="sky"
        />
        <InsightCard
          icon={ShieldCheck}
          title="Best weekday"
          value={weekdayValue}
          detail={weekdayDetail}
          accent="emerald"
        />
        <InsightCard
          icon={Sparkles}
          title="Post-win tilt"
          value={tiltValue}
          detail={tiltDetail}
          accent={
            insights.lossAfterWinRate != null && insights.lossAfterWinRate >= 50
              ? "rose"
              : "slate"
          }
        />
      </div>
    </section>
  );
}
