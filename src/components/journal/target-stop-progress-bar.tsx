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
}: {
  position: number;
  markerClass: string;
  className?: string;
  variant?: "tick" | "live";
}) {
  if (variant === "live") {
    return (
      <span
        className={cn(
          "absolute bottom-full z-30 -translate-x-1/2 pb-px",
          className
        )}
        style={{
          left: `clamp(0.75rem, ${position * 100}%, calc(100% - 0.75rem))`,
        }}
        aria-hidden
      >
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
  // Keep labels inside the bar at any zoom: edge labels flush inward,
  // center labels clamped so -translate-x-1/2 cannot spill past the cell.
  if (align === "start") {
    return (
      <span
        className={cn(
          "absolute top-0 left-0 text-left whitespace-nowrap tabular-nums",
          className
        )}
      >
        {children}
      </span>
    );
  }
  if (align === "end") {
    return (
      <span
        className={cn(
          "absolute top-0 right-0 text-right whitespace-nowrap tabular-nums",
          className
        )}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "absolute top-0 -translate-x-1/2 text-center whitespace-nowrap tabular-nums",
        className
      )}
      style={{
        left: `clamp(0.75rem, ${position * 100}%, calc(100% - 0.75rem))`,
      }}
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
          compact ? "h-8 max-w-[11rem]" : "h-10 max-w-[14rem]"
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
        "mx-auto w-full min-w-0 overflow-x-clip [contain:layout]",
        compact ? "max-w-[11rem] sm:max-w-[12rem]" : "max-w-full"
      )}
      title={status.text}
      role="img"
      aria-label={status.text}
    >
      <div className="relative mb-0.5 h-3.5 w-full shrink-0">
        <span
          className={cn(
            "absolute top-0 -translate-x-1/2 font-bold tabular-nums leading-none tracking-tight",
            compact ? "text-[10px]" : "text-[11px]",
            pctLabelClass,
            glow === fill.variant && fill.variant === "green"
              ? "target-stop-label-glow-green"
              : glow === fill.variant && fill.variant === "red"
                ? "target-stop-label-glow-red"
                : ""
          )}
          style={{
            left: `clamp(0.75rem, ${currentVisual * 100}%, calc(100% - 0.75rem))`,
          }}
        >
          {fill.pct}%
        </span>
      </div>

      <div className="relative px-0.5 pb-0.5 pt-1.5">
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
          />
        </div>
      </div>

      {!compact ? (
        <div className="relative mt-0.5 h-3.5 w-full overflow-hidden px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
          {progress.hasStop && stopVisual != null ? (
            <RangeLabel
              position={stopVisual}
              align={stopVisual <= entryVisual ? "start" : "end"}
            >
              SL
            </RangeLabel>
          ) : null}
          <RangeLabel position={entryVisual} align="center">
            E
          </RangeLabel>
          {progress.hasTarget && targetVisual != null ? (
            <RangeLabel
              position={targetVisual}
              align={targetVisual >= entryVisual ? "end" : "start"}
            >
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
