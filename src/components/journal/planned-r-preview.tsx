"use client";

import type { JournalDirection } from "@/lib/journal-types";
import { formatCurrency } from "@/lib/journal-types";
import { computePlannedR } from "@/lib/smart-position-size";
import { cn } from "@/lib/utils";

type PlannedRPreviewProps = {
  entryPrice: number | string;
  stopLoss: number | string;
  profitTarget: number | string;
  quantity: number | string;
  direction: JournalDirection;
};

export function PlannedRPreview({
  entryPrice,
  stopLoss,
  profitTarget,
  quantity,
  direction,
}: PlannedRPreviewProps) {
  const preview = computePlannedR({
    entryPrice: Number(entryPrice),
    stopLoss: Number(stopLoss),
    profitTarget: Number(profitTarget),
    quantity: Number(quantity),
    direction,
  });

  if (!preview) return null;

  return (
    <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border/70 bg-border/70 text-xs sm:grid-cols-5">
      <div className="bg-background/90 px-2 py-2.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Risk per share
        </p>
        <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
          {preview.riskPerShare}
        </p>
      </div>
      <div className="bg-background/90 px-2 py-2.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Planned R:R
        </p>
        <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
          {preview.riskRewardLabel}
        </p>
      </div>
      <div className="bg-background/90 px-2 py-2.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Max loss
        </p>
        <p
          className={cn(
            "mt-0.5 font-mono text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400"
          )}
        >
          {formatCurrency(-preview.plannedRisk)}
        </p>
      </div>
      <div className="bg-background/90 px-2 py-2.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Max profit
        </p>
        <p
          className={cn(
            "mt-0.5 font-mono text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
          )}
        >
          {formatCurrency(preview.maxProfit)}
        </p>
      </div>
      <div className="col-span-2 bg-background/90 px-2 py-2.5 text-center sm:col-span-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          R-multiple
        </p>
        <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
          {preview.rMultiple != null ? `${preview.rMultiple.toFixed(2)}R` : "—"}
        </p>
      </div>
    </div>
  );
}
