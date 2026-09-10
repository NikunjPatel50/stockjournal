import { memo, type ReactNode } from "react";
import { MetricHint } from "@/components/ui/metric-hint";
import {
  AnimatedCurrency,
  AnimatedNumber,
  AnimatedPercent,
  AnimatedValue,
} from "@/components/ui/animated-number";
import {
  formatCurrency,
  formatMarketPrice,
  type computeJournalSummary,
} from "@/lib/journal-types";
import type {
  FilteredPnlSummary,
  LiveActivePnlSummary,
  OpenPositionsNetPnlSummary,
  OpenPositionsPlannedProfitLossSummary,
} from "@/lib/trade-pnl";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

interface JournalSummaryBarProps {
  summary: ReturnType<typeof computeJournalSummary>;
  livePnl?: LiveActivePnlSummary | null;
  filteredPnl?: FilteredPnlSummary | null;
  openPositionsNetPnl?: OpenPositionsNetPnlSummary | null;
  plannedProfitLoss?: OpenPositionsPlannedProfitLossSummary | null;
  livePnlLoading?: boolean;
  liveDataReady?: boolean;
  displayCurrency?: CurrencyCode;
}

type MetricTone = "profit" | "loss" | "neutral";

function toneValueClass(tone: MetricTone) {
  if (tone === "profit") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "loss") return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

function toneDotClass(tone: MetricTone) {
  if (tone === "profit") return "bg-emerald-500";
  if (tone === "loss") return "bg-rose-500";
  return "bg-muted-foreground/35";
}

function valueFontClass(value: string) {
  const len = value.length;
  if (len <= 10) return "text-xl sm:text-2xl";
  if (len <= 14) return "text-lg sm:text-xl";
  if (len <= 18) return "text-base sm:text-lg";
  return "text-sm sm:text-base";
}

function MetricLabel({
  label,
  labelShort,
  hint,
  tone = "neutral",
  labelClassName,
}: {
  label: string;
  labelShort?: string;
  hint: string;
  tone?: MetricTone;
  labelClassName?: string;
}) {
  const displayLabel = labelShort ?? label;

  return (
    <div className="flex min-w-0 items-center justify-center gap-1.5">
      <span
        className={cn("size-1.5 shrink-0 rounded-full", toneDotClass(tone))}
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 truncate text-center text-xs font-medium text-muted-foreground",
          labelClassName
        )}
      >
        {labelShort ? (
          <>
            <span className="lg:hidden">{labelShort}</span>
            <span className="hidden lg:inline">{label}</span>
          </>
        ) : (
          label
        )}
      </span>
      <MetricHint title={displayLabel} hint={hint} />
    </div>
  );
}

function HeroMetric({
  label,
  labelShort,
  hint,
  value,
  valueTitle,
  valueFontHint,
  tone = "neutral",
  className,
}: {
  label: string;
  labelShort?: string;
  hint: string;
  value: ReactNode;
  valueTitle?: string;
  valueFontHint?: string;
  tone?: MetricTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col items-center justify-center bg-card px-2.5 py-2 text-center sm:px-3 sm:py-2.5",
        className
      )}
    >
      <MetricLabel
        label={label}
        labelShort={labelShort}
        hint={hint}
        tone={tone}
      />
      <div
        className={cn(
          "mt-1 flex min-w-0 flex-wrap items-baseline justify-center gap-x-1.5 font-semibold leading-none tracking-tight",
          NUMERIC_DISPLAY_CLASS,
          valueTitle || valueFontHint
            ? valueFontClass(valueFontHint ?? valueTitle ?? "")
            : "text-xl sm:text-2xl",
          toneValueClass(tone)
        )}
        title={valueTitle}
      >
        {value}
      </div>
    </div>
  );
}

function RewardRiskCell({
  label,
  labelShort,
  hint,
  tone,
  value,
  valueTitle,
  valueClassName,
}: {
  label: string;
  labelShort?: string;
  hint: string;
  tone: MetricTone;
  value: ReactNode;
  valueTitle?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-h-0 flex-col items-center justify-center bg-card px-2 py-2 text-center sm:px-2.5 sm:py-2.5">
      <MetricLabel
        label={label}
        labelShort={labelShort}
        hint={hint}
        tone={tone}
        labelClassName="text-[10px] sm:text-[11px]"
      />
      <div
        className={cn(
          "mt-1 min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold leading-none tracking-tight sm:text-xl",
          NUMERIC_DISPLAY_CLASS,
          valueClassName
        )}
        title={valueTitle}
      >
        {value}
      </div>
    </div>
  );
}

function RewardRiskCard({
  displayCurrency,
  plannedTone,
  plannedProfit,
  plannedLoss,
  accumulatedReward,
  accumulatedRisk,
  liveDataReady,
  showAccumulated,
  accumulatedPending,
}: {
  displayCurrency: CurrencyCode;
  plannedTone: MetricTone;
  plannedProfit: number;
  plannedLoss: number;
  accumulatedReward: number;
  accumulatedRisk: number;
  liveDataReady: boolean;
  showAccumulated: boolean;
  accumulatedPending: boolean;
}) {
  const showLiveColumn = accumulatedPending || showAccumulated;
  const plannedProfitTitle = formatCurrency(plannedProfit, displayCurrency);
  const plannedLossTitle = formatCurrency(plannedLoss, displayCurrency);
  const accumulatedRewardTitle = formatCurrency(accumulatedReward, displayCurrency);
  const accumulatedRiskTitle = formatCurrency(accumulatedRisk, displayCurrency);

  const plannedProfitValue = !liveDataReady ? (
    "…"
  ) : (
    <AnimatedNumber
      value={plannedProfit}
      format={(amount) => formatCurrency(amount, displayCurrency)}
    />
  );

  const plannedLossValue = !liveDataReady ? (
    "…"
  ) : (
    <AnimatedNumber
      value={plannedLoss}
      format={(amount) => formatCurrency(amount, displayCurrency)}
    />
  );

  const liveRewardValue = accumulatedPending
    ? "…"
    : showAccumulated
      ? (
          <AnimatedNumber
            value={accumulatedReward}
            format={(amount) => formatCurrency(amount, displayCurrency)}
          />
        )
      : "—";

  const liveRiskValue = accumulatedPending
    ? "…"
    : showAccumulated
      ? (
          <AnimatedNumber
            value={accumulatedRisk}
            format={(amount) => formatCurrency(amount, displayCurrency)}
          />
        )
      : "—";

  const lossTone: MetricTone =
    plannedLoss >= 0 ? "profit" : plannedLoss < 0 ? "loss" : "neutral";
  const liveLossTone: MetricTone =
    accumulatedRisk >= 0 ? "profit" : accumulatedRisk < 0 ? "loss" : "neutral";
  const profitValueClass = "text-emerald-600 dark:text-emerald-400";
  const plannedLossValueClass =
    plannedLoss >= 0 ? profitValueClass : "text-rose-600 dark:text-rose-400";
  const liveLossValueClass =
    accumulatedRisk >= 0
      ? profitValueClass
      : "text-rose-600 dark:text-rose-400";

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-card lg:col-start-5 lg:row-start-1 lg:row-span-2"
    >
      <div className="shrink-0 border-b border-border/60 px-3 py-1.5 text-center sm:px-4 sm:py-2">
        <MetricLabel
          label="Reward / Risk"
          labelShort="Reward / Risk"
          hint="Planned reward at target and risk at stop across open positions. Live columns show unrealized gains and losses accumulated so far."
          tone={plannedTone}
        />
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-px bg-border/60",
          showLiveColumn ? "grid-cols-2 grid-rows-2" : "grid-cols-1 grid-rows-2"
        )}
      >
        <RewardRiskCell
          label="Planned reward"
          labelShort="Plan reward"
          hint="Total profit if all open positions reach their targets."
          tone="profit"
          value={plannedProfitValue}
          valueTitle={plannedProfitTitle}
          valueClassName={profitValueClass}
        />
        {showLiveColumn ? (
          <RewardRiskCell
            label="Live reward"
            labelShort="Live reward"
            hint="Unrealized gains accumulated so far on open positions."
            tone="profit"
            value={liveRewardValue}
            valueTitle={showAccumulated ? accumulatedRewardTitle : undefined}
            valueClassName={profitValueClass}
          />
        ) : null}
        <RewardRiskCell
          label="Planned risk"
          labelShort="Plan risk"
          hint="Total loss if all open positions hit their stop losses."
          tone={lossTone}
          value={plannedLossValue}
          valueTitle={plannedLossTitle}
          valueClassName={plannedLossValueClass}
        />
        {showLiveColumn ? (
          <RewardRiskCell
            label="Live risk"
            labelShort="Live risk"
            hint="Unrealized losses accumulated so far on open positions."
            tone={liveLossTone}
            value={liveRiskValue}
            valueTitle={showAccumulated ? accumulatedRiskTitle : undefined}
            valueClassName={liveLossValueClass}
          />
        ) : null}
      </div>
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/80 sm:text-sm">
          {title}
        </h3>
        <div className="h-px min-w-0 flex-1 bg-border/60" aria-hidden />
      </div>
      {children}
    </section>
  );
}

export const JournalSummaryBar = memo(function JournalSummaryBar({
  summary,
  livePnl,
  filteredPnl,
  openPositionsNetPnl,
  plannedProfitLoss,
  livePnlLoading,
  liveDataReady = true,
  displayCurrency = DEFAULT_CURRENCY,
}: JournalSummaryBarProps) {
  const filteredTotal = filteredPnl?.totalPnl ?? summary.totalPnl;
  const pnlUp = filteredTotal > 0;
  const pnlDown = filteredTotal < 0;

  const liveUp = (livePnl?.totalPnl ?? 0) > 0;
  const liveDown = (livePnl?.totalPnl ?? 0) < 0;
  const hasActive = (livePnl?.activeCount ?? 0) > 0;
  const hasLivePrice = (livePnl?.pricedCount ?? 0) > 0;
  const hasFilteredActive = (filteredPnl?.activeCount ?? 0) > 0;
  const hasFilteredLivePrice = (filteredPnl?.pricedActiveCount ?? 0) > 0;

  const liveValue = !liveDataReady
    ? "…"
    : !hasActive
      ? formatCurrency(0, displayCurrency)
      : livePnlLoading && !hasLivePrice
        ? "…"
        : hasLivePrice
          ? livePnl!.totalPnl
          : "—";

  const filteredValue = !liveDataReady
    ? "…"
    : hasFilteredActive &&
        filteredPnl!.activeCount === summary.count &&
        livePnlLoading &&
        !hasFilteredLivePrice
      ? "…"
      : filteredTotal;

  const liveValueTitle =
    typeof liveValue === "number"
      ? formatCurrency(liveValue, displayCurrency)
      : liveValue;
  const filteredValueTitle =
    typeof filteredValue === "number"
      ? formatCurrency(filteredValue, displayCurrency)
      : filteredValue;

  const openPnlNumeric = openPositionsNetPnl?.totalPnl ?? 0;
  const openActiveCount = openPositionsNetPnl?.activeCount ?? 0;
  const hasOpenPositions = openActiveCount > 0;
  const openPnlValue = !liveDataReady
    ? "…"
    : !hasOpenPositions
      ? formatCurrency(0, displayCurrency)
      : openPnlNumeric;

  const openPnlUp = openPnlNumeric > 0;
  const openPnlDown = openPnlNumeric < 0;
  const openPnlRoi = openPositionsNetPnl?.totalRoi ?? null;
  const openPnlValueTitle =
    typeof openPnlValue === "number"
      ? openPnlRoi != null
        ? `${formatCurrency(openPnlValue, displayCurrency)} (${openPnlRoi >= 0 ? "+" : ""}${openPnlRoi.toFixed(2)}%)`
        : formatCurrency(openPnlValue, displayCurrency)
      : openPnlValue;

  const dailyTone: MetricTone =
    !liveDataReady || !hasActive || !hasLivePrice
      ? "neutral"
      : liveUp
        ? "profit"
        : liveDown
          ? "loss"
          : "neutral";

  const totalTone: MetricTone =
    filteredValueTitle === "…"
      ? "neutral"
      : pnlUp
        ? "profit"
        : pnlDown
          ? "loss"
          : "neutral";

  const winRateTone: MetricTone =
    summary.winRate >= 50 ? "profit" : summary.winRate > 0 ? "neutral" : "neutral";

  const accuracyTone: MetricTone =
    summary.accuracyPercent >= 50
      ? "profit"
      : summary.accuracyPercent > 0
        ? "loss"
        : "neutral";

  const openTone: MetricTone =
    !liveDataReady || !hasOpenPositions
      ? "neutral"
      : openPnlUp
        ? "profit"
        : openPnlDown
          ? "loss"
          : "neutral";

  const plannedProfit = plannedProfitLoss?.totalPlannedProfit ?? 0;
  const plannedLoss = plannedProfitLoss?.totalPlannedLoss ?? 0;
  const accumulatedReward = plannedProfitLoss?.accumulatedReward ?? 0;
  const accumulatedRisk = plannedProfitLoss?.accumulatedRisk ?? 0;
  const hasAccumulatedLive = (plannedProfitLoss?.pricedCount ?? 0) > 0;

  const plannedTone: MetricTone =
    plannedProfit > 0 && plannedLoss < 0
      ? "profit"
      : plannedProfit === 0 && plannedLoss === 0
        ? "neutral"
        : plannedLoss < 0
          ? "loss"
          : "neutral";

  const showAccumulated =
    liveDataReady &&
    hasOpenPositions &&
    (hasAccumulatedLive || !(livePnlLoading || !hasLivePrice));
  const accumulatedPending =
    liveDataReady &&
    hasOpenPositions &&
    !hasAccumulatedLive &&
    (livePnlLoading || !hasLivePrice);

  return (
    <div className="space-y-5">
      <SummarySection title="Performance">
        <div className="grid min-w-0 auto-rows-fr grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 shadow-sm ring-1 ring-foreground/[0.04] sm:grid-cols-2 dark:ring-foreground/[0.06] lg:grid-cols-5 lg:grid-rows-2 lg:items-stretch">
          <HeroMetric
            className="lg:col-start-1 lg:row-start-1"
            label="Daily P/L"
            hint="Combined price change today across open positions vs prior close (or from entry on day one). Updates live during market hours."
            value={
              <AnimatedValue
                value={liveValue}
                format={(amount) => formatCurrency(amount, displayCurrency)}
              />
            }
            valueTitle={liveValueTitle}
            tone={dailyTone}
          />
          <HeroMetric
            className="lg:col-start-2 lg:row-start-1"
            label="Total P/L"
            hint="Net profit or loss for all trades in your current filter, including realized on closed trades plus live unrealized on open positions."
            value={
              <AnimatedValue
                value={filteredValue}
                format={(amount) => formatCurrency(amount, displayCurrency)}
              />
            }
            valueTitle={filteredValueTitle}
            tone={totalTone}
          />
          <HeroMetric
            className="lg:col-start-3 lg:row-start-1"
            label="Win rate"
            hint="Share of trades marked as wins out of all trades in your current filter."
            value={
              <AnimatedPercent
                value={summary.winRate}
                decimals={1}
                signed={false}
              />
            }
            valueTitle={`${summary.winRate.toFixed(1)}%`}
            tone={winRateTone}
          />
          <HeroMetric
            className="lg:col-start-4 lg:row-start-1"
            label="Accuracy %"
            hint="Win rate among decided outcomes only: wins divided by wins plus losses, excluding open and breakeven trades."
            value={
              <AnimatedPercent
                value={summary.accuracyPercent}
                decimals={1}
                signed={false}
              />
            }
            valueTitle={`${summary.accuracyPercent.toFixed(1)}%`}
            tone={accuracyTone}
          />
          <HeroMetric
            className="lg:col-start-1 lg:row-start-2"
            label="Total invested"
            hint="Total capital deployed in open positions (entry price × quantity)."
            value={
              <AnimatedNumber
                value={summary.totalInvested}
                format={(amount) => formatMarketPrice(amount, displayCurrency)}
              />
            }
            valueTitle={formatMarketPrice(summary.totalInvested, displayCurrency)}
            tone="neutral"
          />
          <HeroMetric
            className="lg:col-start-2 lg:row-start-2"
            label="Net P/L across open positions"
            labelShort="Open net P&L"
            hint="Sum of the Net P&L values shown for each row in the active trade log."
            value={
              typeof openPnlValue === "number" ? (
                <AnimatedCurrency
                  value={openPnlValue}
                  currency={displayCurrency}
                />
              ) : (
                openPnlValue
              )
            }
            valueTitle={openPnlValueTitle}
            valueFontHint={
              typeof openPnlValue === "number"
                ? formatCurrency(openPnlValue, displayCurrency)
                : undefined
            }
            tone={openTone}
          />
          <HeroMetric
            className="lg:col-start-3 lg:row-start-2"
            label="Total win"
            hint="Sum of all positive P&L from winning trades in your current filter."
            value={
              <AnimatedNumber
                value={summary.totalWin}
                format={(amount) => formatCurrency(amount, displayCurrency)}
              />
            }
            valueTitle={formatCurrency(summary.totalWin, displayCurrency)}
            tone={summary.totalWin > 0 ? "profit" : "neutral"}
          />
          <HeroMetric
            className="lg:col-start-4 lg:row-start-2"
            label="Total loss"
            hint="Sum of all losses from losing trades in your current filter, shown as a negative amount."
            value={
              <AnimatedNumber
                value={-summary.totalLoss}
                format={(amount) => formatCurrency(amount, displayCurrency)}
              />
            }
            valueTitle={formatCurrency(-summary.totalLoss, displayCurrency)}
            tone={summary.totalLoss > 0 ? "loss" : "neutral"}
          />
          <RewardRiskCard
            displayCurrency={displayCurrency}
            plannedTone={plannedTone}
            plannedProfit={plannedProfit}
            plannedLoss={plannedLoss}
            accumulatedReward={accumulatedReward}
            accumulatedRisk={accumulatedRisk}
            liveDataReady={liveDataReady}
            showAccumulated={showAccumulated}
            accumulatedPending={accumulatedPending}
          />
        </div>
      </SummarySection>
    </div>
  );
});
