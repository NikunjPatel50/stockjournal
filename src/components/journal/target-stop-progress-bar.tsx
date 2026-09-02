"use client";

import { memo } from "react";
import { isClosedTrade, type JournalTrade } from "@/lib/journal-types";
import {
  computeTargetStopProgress,
  getTargetStopMarkerBlink,
  getTargetStopStatusLabel,
  type TargetStopProgress,
} from "@/lib/trade-target-progress";
import { cn } from "@/lib/utils";

const FILL_STYLE_MAP = {
  green: {
    bar: "bg-emerald-400/90 dark:bg-emerald-500/55",
    label: "text-emerald-800 dark:text-emerald-300",
    glow: "target-stop-fill-glow-green",
    labelGlow: "target-stop-label-glow-green",
  },
  red: {
    bar: "bg-rose-400/90 dark:bg-rose-500/55",
    label: "text-rose-800 dark:text-rose-300",
    glow: "target-stop-fill-glow-red",
    labelGlow: "target-stop-label-glow-red",
  },
  neutral: {
    bar: "bg-muted-foreground/25",
    label: "text-muted-foreground",
    glow: "",
    labelGlow: "",
  },
} as const;

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

function resolveFillStyles(
  variant: "green" | "red" | "neutral",
  glow: "green" | "red" | null
) {
  const tone = variant === "neutral" && glow ? glow : variant;
  const styles = FILL_STYLE_MAP[tone];
  const isGlowing = glow === tone;

  return {
    bar: styles.bar,
    label: styles.label,
    glow: isGlowing ? styles.glow : "",
    labelGlow: isGlowing ? styles.labelGlow : "",
  };
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

  const closed = isClosedTrade(trade);
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
          compact ? "h-3.5 max-w-[10rem]" : "h-4 max-w-[9rem]"
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
  const glow = isClosedTrade(trade) ? null : getTargetStopMarkerBlink(progress);
  const fill = resolveFillState(progress);
  const styles = resolveFillStyles(fill.variant, glow);
  const showFill = fill.pct > 0 && fill.variant !== "neutral";

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 [contain:layout]",
        compact ? "max-w-[10rem] sm:max-w-[11rem]" : "max-w-[9rem] sm:max-w-[9.5rem]"
      )}
      title={status.text}
      role="img"
      aria-label={status.text}
    >
      <div className="space-y-0.5">
        <div className={cn("px-0.5 py-1", styles.glow && "py-1.5")}>
          <div
            className={cn(
              "target-stop-stripe-track relative overflow-hidden rounded-full ring-1 ring-border/40",
              compact ? "h-3.5" : "h-4"
            )}
          >
            {showFill ? (
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-full origin-left rounded-l-full transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none motion-reduce:will-change-auto",
                  styles.bar,
                  styles.glow
                )}
                style={{ transform: `scaleX(${fill.pct / 100})` }}
              />
            ) : null}
          </div>
        </div>
        {showFill ? (
          <div className="relative h-3.5 w-full min-w-0">
            <span
              className={cn(
                "absolute top-0 max-w-full truncate font-bold tabular-nums leading-none tracking-tight",
                compact ? "text-[9px]" : "text-[10px]",
                styles.label,
                styles.labelGlow
              )}
              style={{
                left: `clamp(0.75rem, ${fill.pct}%, calc(100% - 0.75rem))`,
                transform: "translateX(-50%)",
              }}
            >
              {fill.pct}%
            </span>
          </div>
        ) : null}
      </div>
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
