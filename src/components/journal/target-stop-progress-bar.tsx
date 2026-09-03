"use client";

import { memo, type ReactNode } from "react";
import type { JournalTrade } from "@/lib/journal-types";
import {
  computeTargetStopProgress,
  getTargetStopMarkerBlink,
  getTargetStopStatusLabel,
  type TargetStopProgress,
} from "@/lib/trade-target-progress";
import { cn } from "@/lib/utils";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computeRangeLayout(
  trade: JournalTrade,
  progress: TargetStopProgress,
  currentPrice: number
) {
  const { entryPrice, profitTarget, stopLoss } = trade;
  const { hasTarget, hasStop } = progress;

  if (hasTarget && hasStop) {
    const min = Math.min(stopLoss, profitTarget);
    const max = Math.max(stopLoss, profitTarget);
    const span = max - min;
    if (span <= 0) {
      return {
        entryVisual: 0.5,
        currentVisual: 0.5,
        stopVisual: 0,
        targetVisual: 1,
        leftTone: "red" as const,
      };
    }

    const toVisual = (price: number) => clamp((price - min) / span, 0, 1);
    const stopOnLeft = stopLoss < entryPrice;

    return {
      entryVisual: toVisual(entryPrice),
      currentVisual: toVisual(currentPrice),
      stopVisual: toVisual(stopLoss),
      targetVisual: toVisual(profitTarget),
      leftTone: stopOnLeft ? ("red" as const) : ("green" as const),
    };
  }

  if (hasTarget) {
    const min = Math.min(entryPrice, profitTarget);
    const max = Math.max(entryPrice, profitTarget);
    const span = max - min;
    const toVisual =
      span > 0
        ? (price: number) => clamp((price - min) / span, 0, 1)
        : () => 0.5;
    return {
      entryVisual: toVisual(entryPrice),
      currentVisual: toVisual(currentPrice),
      stopVisual: null,
      targetVisual: toVisual(profitTarget),
      leftTone: "green" as const,
    };
  }

  if (hasStop) {
    const min = Math.min(stopLoss, entryPrice);
    const max = Math.max(stopLoss, entryPrice);
    const span = max - min;
    const toVisual =
      span > 0
        ? (price: number) => clamp((price - min) / span, 0, 1)
        : () => 0.5;
    return {
      entryVisual: toVisual(entryPrice),
      currentVisual: toVisual(currentPrice),
      stopVisual: toVisual(stopLoss),
      targetVisual: null,
      leftTone: "red" as const,
    };
  }

  return {
    entryVisual: 0.5,
    currentVisual: 0.5,
    stopVisual: null,
    targetVisual: null,
    leftTone: "red" as const,
  };
}

function resolveFillState(progress: TargetStopProgress): {
  pct: number;
  variant: "green" | "red" | "neutral";
} {
  const { targetPct, stopPct, hasTarget, hasStop } = progress;

  if (hasTarget && targetPct >= 100) {
    return { pct: 100, variant: "green" };
  }
  if (hasStop && stopPct >= 100) {
    return { pct: 100, variant: "red" };
  }
  if (stopPct > 0 && (!hasTarget || stopPct > targetPct)) {
    return { pct: Math.min(100, Math.round(stopPct)), variant: "red" };
  }
  if (targetPct > 0) {
    return { pct: Math.min(100, Math.round(targetPct)), variant: "green" };
  }
  return { pct: 0, variant: "neutral" };
}

function RangeNode({
  position,
  markerClass,
  className,
  variant = "tick",
  label,
  labelClassName,
}: {
  position: number;
  markerClass: string;
  className?: string;
  variant?: "tick" | "live";
  label?: ReactNode;
  labelClassName?: string;
}) {
  if (variant === "live") {
    return (
      <span
        className={cn(
          "absolute bottom-full z-30 flex -translate-x-1/2 flex-col items-center pb-px",
          className
        )}
        style={{
          left: `clamp(0.75rem, ${position * 100}%, calc(100% - 0.75rem))`,
        }}
        aria-hidden
      >
        {label ? (
          <span
            className={cn(
              "mb-0.5 font-bold tabular-nums leading-none tracking-tight",
              labelClassName
            )}
          >
            {label}
          </span>
        ) : null}
        <span
          className={cn(
            "block size-0 border-x-[3px] border-x-transparent border-t-[4px] sm:border-x-[4px] sm:border-t-[5px]",
            markerClass
          )}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "absolute top-1/2 z-20 h-2 w-px -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-2.5",
        markerClass,
        className
      )}
      style={{ left: `${position * 100}%` }}
      aria-hidden
    />
  );
}

function RangeLabel({
  position,
  align,
  children,
  className,
}: {
  position: number;
  align: "start" | "center" | "end";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute top-0 max-w-[42%] truncate tabular-nums",
        align === "start" && "left-0 text-left",
        align === "center" && "-translate-x-1/2 text-center",
        align === "end" && "right-0 text-right",
        className
      )}
      style={align === "center" ? { left: `${position * 100}%` } : undefined}
    >
      {children}
    </span>
  );
}

function tradeFieldsEqual(a: JournalTrade, b: JournalTrade) {
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.assetClass === b.assetClass &&
    a.direction === b.direction &&
    a.entryPrice === b.entryPrice &&
    a.profitTarget === b.profitTarget &&
    a.stopLoss === b.stopLoss &&
    a.exitPrice === b.exitPrice
  );
}

function visualStateEqual(
  trade: JournalTrade,
  prevPrice: number | null,
  nextPrice: number | null
) {
  if (prevPrice === nextPrice) return true;
  if (prevPrice == null || nextPrice == null) return false;

  const prevProgress = computeTargetStopProgress({
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    profitTarget: trade.profitTarget,
    stopLoss: trade.stopLoss,
    currentPrice: prevPrice,
  });
  const nextProgress = computeTargetStopProgress({
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    profitTarget: trade.profitTarget,
    stopLoss: trade.stopLoss,
    currentPrice: nextPrice,
  });

  if (!prevProgress && !nextProgress) return true;
  if (!prevProgress || !nextProgress) return false;

  const prevFill = resolveFillState(prevProgress);
  const nextFill = resolveFillState(nextProgress);
  if (prevFill.pct !== nextFill.pct || prevFill.variant !== nextFill.variant) {
    return false;
  }

  const prevPos = Math.round(
    computeRangeLayout(trade, prevProgress, prevPrice).currentVisual * 100
  );
  const nextPos = Math.round(
    computeRangeLayout(trade, nextProgress, nextPrice).currentVisual * 100
  );
  if (prevPos !== nextPos) return false;

  const closed = (trade.status ?? "Closed") === "Closed";
  const prevGlow = closed ? null : getTargetStopMarkerBlink(prevProgress);
  const nextGlow = closed ? null : getTargetStopMarkerBlink(nextProgress);
  return prevGlow === nextGlow;
}

type TargetStopProgressBarProps = {
  trade: JournalTrade;
  currentPrice: number | null;
  loading?: boolean;
  compact?: boolean;
};

function TargetStopProgressBarInner({
  trade,
  currentPrice,
  loading = false,
  compact = false,
}: TargetStopProgressBarProps) {
  if (trade.assetClass === "Options") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  if (loading && currentPrice == null) {
    return (
      <span
        className={cn(
          "mx-auto block w-full animate-pulse rounded-full bg-muted",
          compact ? "h-7 max-w-[11rem]" : "h-9 max-w-[14rem]"
        )}
      />
    );
  }

  if (currentPrice == null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const progress = computeTargetStopProgress({
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    profitTarget: trade.profitTarget,
    stopLoss: trade.stopLoss,
    currentPrice,
  });

  if (!progress) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const status = getTargetStopStatusLabel(progress);
  const glow = (trade.status ?? "Closed") === "Closed" ? null : getTargetStopMarkerBlink(progress);
  const fill = resolveFillState(progress);
  const { entryVisual, currentVisual, stopVisual, targetVisual, leftTone } =
    computeRangeLayout(trade, progress, currentPrice);

  const pctLabelClass =
    fill.variant === "green"
      ? "text-emerald-700 dark:text-emerald-300"
      : fill.variant === "red"
        ? "text-rose-700 dark:text-rose-300"
        : "text-muted-foreground";

  const currentMarkerClass =
    glow === "green"
      ? "target-stop-fill-glow-green border-t-emerald-500 dark:border-t-emerald-400"
      : glow === "red"
        ? "target-stop-fill-glow-red border-t-rose-500 dark:border-t-rose-400"
        : "border-t-foreground/80 dark:border-t-white/90";

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 [contain:layout_paint]",
        compact ? "max-w-[11rem] sm:max-w-[12rem]" : "max-w-[14rem] sm:max-w-[15rem]"
      )}
      title={status.text}
      role="img"
      aria-label={status.text}
    >
      <div className={cn("relative px-0.5 pb-1", compact ? "pt-3" : "pt-5")}>
        <div
          className={cn(
            "relative h-1 overflow-visible rounded-full bg-muted/80 sm:h-1.5",
            glow && "py-0.5"
          )}
        >
          {progress.hasStop && progress.hasTarget ? (
            <>
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-l-full",
                  leftTone === "red"
                    ? "bg-rose-400/85 dark:bg-rose-500/50"
                    : "bg-teal-500/85 dark:bg-teal-400/55"
                )}
                style={{ width: `${entryVisual * 100}%` }}
              />
              <div
                className={cn(
                  "absolute inset-y-0 rounded-r-full",
                  leftTone === "red"
                    ? "bg-teal-500/85 dark:bg-teal-400/55"
                    : "bg-rose-400/85 dark:bg-rose-500/50"
                )}
                style={{ left: `${entryVisual * 100}%`, right: 0 }}
              />
            </>
          ) : progress.hasTarget ? (
            <div className="absolute inset-0 rounded-full bg-teal-500/85 dark:bg-teal-400/55" />
          ) : progress.hasStop ? (
            <div className="absolute inset-0 rounded-full bg-rose-400/85 dark:bg-rose-500/50" />
          ) : null}

          {progress.hasStop && stopVisual != null ? (
            <RangeNode
              position={stopVisual}
              markerClass="bg-rose-500 dark:bg-rose-400"
            />
          ) : null}
          <RangeNode
            position={entryVisual}
            markerClass="bg-slate-600 dark:bg-slate-300"
          />
          {progress.hasTarget && targetVisual != null ? (
            <RangeNode
              position={targetVisual}
              markerClass="bg-teal-500 dark:bg-teal-400"
            />
          ) : null}

          <RangeNode
            position={currentVisual}
            markerClass={currentMarkerClass}
            variant="live"
            label={fill.pct > 0 ? `${fill.pct}%` : undefined}
            labelClassName={cn(
              compact ? "text-[9px]" : "text-[10px]",
              pctLabelClass,
              glow === fill.variant && fill.variant === "green"
                ? "target-stop-label-glow-green"
                : glow === fill.variant && fill.variant === "red"
                  ? "target-stop-label-glow-red"
                  : ""
            )}
          />
        </div>
      </div>

      {!compact ? (
        <div className="relative mt-0.5 h-3 w-full text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-[9px]">
          {progress.hasStop && stopVisual != null ? (
            <RangeLabel position={stopVisual} align="center">
              SL
            </RangeLabel>
          ) : null}
          <RangeLabel position={entryVisual} align="center">
            E
          </RangeLabel>
          {progress.hasTarget && targetVisual != null ? (
            <RangeLabel position={targetVisual} align="center">
              T
            </RangeLabel>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const TargetStopProgressBar = memo(
  TargetStopProgressBarInner,
  (prev, next) => {
    if (prev.loading !== next.loading) return false;
    if (prev.compact !== next.compact) return false;
    if (!tradeFieldsEqual(prev.trade, next.trade)) return false;
    return visualStateEqual(prev.trade, prev.currentPrice, next.currentPrice);
  }
);

TargetStopProgressBar.displayName = "TargetStopProgressBar";
