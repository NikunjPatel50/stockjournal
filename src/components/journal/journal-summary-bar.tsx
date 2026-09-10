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
        "flex min-w-0 flex-col items-center bg-card px-3 py-1.5 text-center sm:px-4 sm:py-2",
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

const REWARD_RISK_AMOUNT_CLASS = cn(
  "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-right font-semibold leading-tight",
  "text-[length:clamp(0.8125rem,1.35cqi+0.45rem,1.125rem)]",
  NUMERIC_DISPLAY_CLASS
);

function RewardRiskAmount({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={cn(REWARD_RISK_AMOUNT_CLASS, className)} title={title}>
      {children}
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

  const rowLabelClass =
    "min-w-0 shrink-0 py-0.5 pr-2 text-left text-[length:clamp(0.8125rem,1.15cqi+0.5rem,1.0625rem)] leading-tight text-muted-foreground";
  const columnLabelClass =
    "pb-1 text-right text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 @[12rem]/reward-risk:text-sm";

  return (
    <div
      className="@container/reward-risk flex min-w-0 flex-col items-center justify-center bg-card px-3 py-1.5 text-center sm:px-4 sm:py-2 lg:col-start-5 lg:row-start-1 lg:row-span-2"
    >
      <MetricLabel
        label="Reward / Risk"
        labelShort="Reward / Risk"
        hint="Planned reward at target and risk at stop across open positions. Live columns show unrealized gains and losses accumulated so far."
        tone={plannedTone}
      />

      <div className="mt-2 w-full min-w-0 overflow-x-auto">
        <div className="@[11rem]/reward-risk:hidden min-w-[8.5rem] space-y-2.5 text-left">
          {[
            {
              label: "Reward",
              planned: plannedProfitValue,
              plannedTitle: plannedProfitTitle,
              plannedClass: "text-emerald-600 dark:text-emerald-400",
              live: liveRewardValue,
              liveTitle: showAccumulated ? accumulatedRewardTitle : undefined,
              liveClass: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Risk",
              planned: plannedLossValue,
              plannedTitle: plannedLossTitle,
              plannedClass:
                plannedLoss >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              live: liveRiskValue,
              liveTitle: showAccumulated ? accumulatedRiskTitle : undefined,
              liveClass:
                accumulatedRisk >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
            },
          ].map((row) => (
            <div key={row.label} className="min-w-0">
              <p className={rowLabelClass}>{row.label}</p>
              <div
                className={cn(
                  "mt-1 grid min-w-0 gap-x-2 gap-y-1",
                  showLiveColumn ? "grid-cols-2" : "grid-cols-1"
                )}
              >
                <div className="min-w-0">
                  <p className={columnLabelClass}>Planned</p>
                  <RewardRiskAmount
                    className={row.plannedClass}
                    title={row.plannedTitle}
                  >
                    {row.planned}
                  </RewardRiskAmount>
                </div>
                {showLiveColumn ? (
                  <div className="min-w-0">
                    <p className={columnLabelClass}>Live</p>
                    <RewardRiskAmount
                      className={row.liveClass}
                      title={row.liveTitle}
                    >
                      {row.live}
                    </RewardRiskAmount>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "hidden min-w-[9.5rem] @[11rem]/reward-risk:grid",
            showLiveColumn
              ? "grid-cols-[minmax(3.25rem,auto)_minmax(0,1fr)_minmax(0,1fr)]"
              : "grid-cols-[minmax(3.25rem,auto)_minmax(0,1fr)]",
            "w-full items-center gap-x-2 gap-y-1.5"
          )}
        >
          <div className="sr-only">Metric</div>
          <div className={columnLabelClass}>Planned</div>
          {showLiveColumn ? (
            <div className={columnLabelClass}>Live</div>
          ) : null}

          <div className={rowLabelClass}>Reward</div>
          <RewardRiskAmount
            className="text-emerald-600 dark:text-emerald-400"
            title={plannedProfitTitle}
          >
            {plannedProfitValue}
          </RewardRiskAmount>
          {showLiveColumn ? (
            <RewardRiskAmount
              className="text-emerald-600 dark:text-emerald-400"
              title={showAccumulated ? accumulatedRewardTitle : undefined}
            >
              {liveRewardValue}
            </RewardRiskAmount>
          ) : null}

          <div className={rowLabelClass}>Risk</div>
          <RewardRiskAmount
            className={
              plannedLoss >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }
            title={plannedLossTitle}
          >
            {plannedLossValue}
          </RewardRiskAmount>
          {showLiveColumn ? (
            <RewardRiskAmount
              className={
                accumulatedRisk >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }
              title={showAccumulated ? accumulatedRiskTitle : undefined}
            >
              {liveRiskValue}
            </RewardRiskAmount>
          ) : null}
        </div>
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
        <div className="grid min-w-0 grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 shadow-sm ring-1 ring-foreground/[0.04] sm:grid-cols-2 dark:ring-foreground/[0.06] lg:grid-cols-5 lg:grid-rows-2">
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
