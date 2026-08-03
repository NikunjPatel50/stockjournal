"use client";

import type { JournalTrade } from "@/lib/journal-types";
import {
  computeTargetStopProgress,
  getTargetStopStatusLabel,
} from "@/lib/trade-target-progress";
import { cn } from "@/lib/utils";

export function TargetStopProgressBar({
  trade,
  currentPrice,
  loading = false,
  compact = false,
}: {
  trade: JournalTrade;
  currentPrice: number | null;
  loading?: boolean;
  compact?: boolean;
}) {
  if (trade.assetClass === "Options") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  if (loading && currentPrice == null) {
    return (
      <span className="mx-auto block h-7 w-full max-w-[8rem] animate-pulse rounded-md bg-muted" />
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
  const markerLeft = `${(1 - progress.barPosition) * 100}%`;
  const entryLeft = `${(1 - progress.entryBarPosition) * 100}%`;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[8.5rem]",
        compact ? "space-y-0.5" : "space-y-1"
      )}
      title={status.text}
    >
      <div className="relative h-2 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/50 to-emerald-500/50" />
        {progress.hasTarget && progress.hasStop ? (
          <div
            className="absolute top-0 bottom-0 z-[1] w-px -translate-x-1/2 bg-foreground/30"
            style={{ left: entryLeft }}
            aria-hidden
          />
        ) : null}
        <div
          className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm"
          style={{ left: markerLeft }}
        />
      </div>
      <p
        className={cn(
          "text-center text-[10px] font-semibold leading-none",
          status.tone
        )}
      >
        {status.text}
      </p>
    </div>
  );
}
