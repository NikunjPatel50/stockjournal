import { memo, type ReactNode } from "react";
import { MetricHint } from "@/components/ui/metric-hint";
import { AnimatedNumber, AnimatedValue } from "@/components/ui/animated-number";
import {
  formatCurrency,
  formatMarketPrice,
  type computeJournalSummary,
} from "@/lib/journal-types";
import type {
  FilteredPnlSummary,
  LiveActivePnlSummary,
  OpenPositionsNetPnlSummary,
} from "@/lib/trade-pnl";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

interface JournalSummaryBarProps {
  summary: ReturnType<typeof computeJournalSummary>;
  livePnl?: LiveActivePnlSummary | null;
  filteredPnl?: FilteredPnlSummary | null;
  openPositionsNetPnl?: OpenPositionsNetPnlSummary | null;
  livePnlLoading?: boolean;
  /** Wait until client storage/quotes are ready to avoid hydration mismatch. */
  liveDataReady?: boolean;
  displayCurrency?: CurrencyCode;
}

type MetricTone = "profit" | "loss" | "neutral";

function toneValueClass(tone: MetricTone) {
  if (tone === "profit") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "loss") return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

function valueFontClass(value: string, featured?: boolean): string {
  const len = value.length;
  if (featured) {
    if (len <= 10) return "text-2xl sm:text-3xl";
    if (len <= 14) return "text-xl sm:text-2xl";
    if (len <= 18) return "text-lg sm:text-xl";
    return "text-base sm:text-lg";
  }
  if (len <= 10) return "text-lg sm:text-xl";
  if (len <= 14) return "text-base sm:text-lg";
  if (len <= 18) return "text-sm sm:text-base";
  return "text-xs sm:text-sm";
}

function Metric({
  label,
  labelShort,
  hint,
  value,
  valueTitle,
  tone = "neutral",
  featured,
}: {
  label: string;
  labelShort?: string;
  hint: string;
  value: ReactNode;
  valueTitle?: string;
  tone?: MetricTone;
  featured?: boolean;
}) {
  const displayLabel = labelShort ?? label;

  return (
    <div className="min-w-0 text-center">
      <div className="flex items-center justify-center gap-1">
        <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground sm:text-xs">
          {labelShort ? (
            <>
              <span className="sm:hidden">{labelShort}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </p>
        <MetricHint title={displayLabel} hint={hint} />
      </div>
      <div
        className={cn(
          "mt-1.5 flex min-w-0 flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5 font-semibold tracking-tight",
          NUMERIC_DISPLAY_CLASS,
          valueTitle ? valueFontClass(valueTitle, featured) : featured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
          toneValueClass(tone)
        )}
        title={valueTitle}
      >
        {value}
      </div>
    </div>
  );
}

function MetricGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
        {title}
      </p>
      <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 sm:gap-x-8">
        {children}
      </div>
    </section>
  );
}

export const JournalSummaryBar = memo(function JournalSummaryBar({
  summary,
  livePnl,
  filteredPnl,
  openPositionsNetPnl,
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

  return (
    <div className="space-y-6">
      <MetricGroup title="Performance">
        <Metric
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
          featured
        />
        <Metric
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
          featured
        />
        <Metric
          label="Win rate"
          hint="Share of trades marked as wins out of all trades in your current filter."
          value={`${summary.winRate.toFixed(1)}%`}
          valueTitle={`${summary.winRate.toFixed(1)}%`}
          tone="neutral"
        />
        <Metric
          label="Accuracy %"
          hint="Win rate among decided outcomes only: wins divided by wins plus losses, excluding open and breakeven trades."
          value={`${summary.accuracyPercent.toFixed(1)}%`}
          valueTitle={`${summary.accuracyPercent.toFixed(1)}%`}
          tone={accuracyTone}
        />
      </MetricGroup>

      <MetricGroup title="Positions & outcomes">
        <Metric
          label="Total invested"
          hint="Total capital deployed in open positions (entry price × quantity)."
          value={formatMarketPrice(summary.totalInvested, displayCurrency)}
          valueTitle={formatMarketPrice(summary.totalInvested, displayCurrency)}
          tone="neutral"
        />
        <Metric
          label="Net P/L across open positions"
          labelShort="Open net P&L"
          hint="Sum of the Net P&L values shown for each row in the active trade log."
          value={
            typeof openPnlValue === "number" ? (
              <>
                <AnimatedNumber
                  value={openPnlValue}
                  format={(amount) => formatCurrency(amount, displayCurrency)}
                />
                {openPnlRoi != null ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    ({openPnlRoi >= 0 ? "+" : ""}
                    {openPnlRoi.toFixed(2)}%)
                  </span>
                ) : null}
              </>
            ) : (
              openPnlValue
            )
          }
          valueTitle={openPnlValueTitle}
          tone={openTone}
        />
        <Metric
          label="Total win"
          hint="Sum of all positive P&L from winning trades in your current filter."
          value={formatCurrency(summary.totalWin, displayCurrency)}
          valueTitle={formatCurrency(summary.totalWin, displayCurrency)}
          tone={summary.totalWin > 0 ? "profit" : "neutral"}
        />
        <Metric
          label="Total loss"
          hint="Sum of all losses from losing trades in your current filter, shown as a negative amount."
          value={formatCurrency(-summary.totalLoss, displayCurrency)}
          valueTitle={formatCurrency(-summary.totalLoss, displayCurrency)}
          tone={summary.totalLoss > 0 ? "loss" : "neutral"}
        />
      </MetricGroup>
    </div>
  );
});
