import { memo, type ReactNode } from "react";
import { MetricHint } from "@/components/ui/metric-hint";
import {
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

function toneAccentClass(tone: MetricTone) {
  if (tone === "profit") return "bg-emerald-500";
  if (tone === "loss") return "bg-rose-500";
  return "bg-border";
}

function valueFontClass(value: string) {
  const len = value.length;
  if (len <= 10) return "text-2xl sm:text-[1.75rem]";
  if (len <= 14) return "text-xl sm:text-2xl";
  if (len <= 18) return "text-lg sm:text-xl";
  return "text-base sm:text-lg";
}

function MetricLabel({
  label,
  labelShort,
  hint,
}: {
  label: string;
  labelShort?: string;
  hint: string;
}) {
  const displayLabel = labelShort ?? label;

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 truncate text-[11px] font-medium leading-none tracking-wide text-muted-foreground sm:text-xs">
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
}: {
  label: string;
  labelShort?: string;
  hint: string;
  value: ReactNode;
  valueTitle?: string;
  /** Shorter string for responsive font sizing (avoids shrinking when valueTitle includes extra text). */
  valueFontHint?: string;
  tone?: MetricTone;
}) {
  return (
    <div
      className={cn(
        "relative min-w-0 rounded-lg px-4 py-3 sm:px-5 sm:py-3.5",
        tone === "profit" && "bg-emerald-500/[0.06]",
        tone === "loss" && "bg-rose-500/[0.06]",
        tone === "neutral" && "bg-muted/25"
      )}
    >
      <span
        className={cn(
          "absolute inset-y-3 left-0 w-0.5 rounded-full",
          toneAccentClass(tone)
        )}
        aria-hidden
      />
      <MetricLabel label={label} labelShort={labelShort} hint={hint} />
      <div
        className={cn(
          "mt-2 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-semibold tracking-tight",
          NUMERIC_DISPLAY_CLASS,
          valueTitle || valueFontHint
            ? valueFontClass(valueFontHint ?? valueTitle ?? "")
            : "text-2xl sm:text-[1.75rem]",
          toneValueClass(tone)
        )}
        title={valueTitle}
      >
        {value}
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
        <h3 className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
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
  const plannedValueTitle = hasOpenPositions
    ? `${formatCurrency(plannedProfit, displayCurrency)} / ${formatCurrency(plannedLoss, displayCurrency)}`
    : `${formatCurrency(0, displayCurrency)} / ${formatCurrency(0, displayCurrency)}`;

  const plannedTone: MetricTone =
    plannedProfit > 0 && plannedLoss < 0
      ? "profit"
      : plannedProfit === 0 && plannedLoss === 0
        ? "neutral"
        : plannedLoss < 0
          ? "loss"
          : "neutral";

  return (
    <div className="space-y-5">
      <SummarySection title="Performance">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HeroMetric
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
        </div>
      </SummarySection>

      <Accordion defaultValue={["positions-outcomes"]} className="min-w-0">
        <AccordionItem value="positions-outcomes" className="border-0">
          <AccordionTrigger className="w-full gap-3 px-0 py-0 hover:no-underline focus-visible:ring-0">
            <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
              <h3 className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                Positions & outcomes
              </h3>
              <div className="h-px min-w-0 flex-1 bg-border/60" aria-hidden />
              {typeof openPnlValue === "number" ? (
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums sm:text-base",
                    NUMERIC_DISPLAY_CLASS,
                    toneValueClass(openTone)
                  )}
                >
                  {formatCurrency(openPnlValue, displayCurrency)}
                  {openPnlRoi != null ? (
                    <span className="ml-1 font-medium text-muted-foreground">
                      ({openPnlRoi >= 0 ? "+" : ""}
                      {openPnlRoi.toFixed(2)}%)
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <HeroMetric
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
                    <span className="text-sm font-medium text-muted-foreground sm:text-base">
                      (<AnimatedPercent value={openPnlRoi} decimals={2} />)
                    </span>
                  ) : null}
                </>
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
          <HeroMetric
            label="Target profit / stop loss"
            labelShort="Target P/L"
            hint="Sum of planned profit at target and planned loss at stop across all open positions. Based on entry, target, and stop only — does not change with live price."
            value={
              !liveDataReady ? (
                "…"
              ) : (
                <>
                  <AnimatedNumber
                    value={plannedProfit}
                    format={(amount) => formatCurrency(amount, displayCurrency)}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="text-muted-foreground">/</span>
                  <AnimatedNumber
                    value={plannedLoss}
                    format={(amount) => formatCurrency(amount, displayCurrency)}
                    className={
                      plannedLoss >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }
                  />
                </>
              )
            }
            valueTitle={plannedValueTitle}
            tone={plannedTone}
          />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
});
