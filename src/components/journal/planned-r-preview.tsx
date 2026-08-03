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
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-border/80 bg-muted/30 p-3 text-xs sm:grid-cols-5">
      <div className="text-center">
        <p className="text-muted-foreground">Risk / share</p>
        <p className="font-semibold tabular-nums">{preview.riskPerShare}</p>
      </div>
      <div className="text-center">
        <p className="text-muted-foreground">Planned R</p>
        <p className="font-semibold tabular-nums">{preview.riskRewardLabel}</p>
      </div>
      <div className="text-center">
        <p className="text-muted-foreground">Max loss</p>
        <p
          className={cn(
            "font-semibold tabular-nums text-rose-600 dark:text-rose-400"
          )}
        >
          {formatCurrency(-preview.plannedRisk)}
        </p>
      </div>
      <div className="text-center">
        <p className="text-muted-foreground">Max profit</p>
        <p
          className={cn(
            "font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
          )}
        >
          {formatCurrency(preview.maxProfit)}
        </p>
      </div>
      <div className="col-span-2 text-center sm:col-span-1">
        <p className="text-muted-foreground">R-multiple</p>
        <p className="font-semibold tabular-nums">
          {preview.rMultiple != null ? `${preview.rMultiple.toFixed(2)}R` : "—"}
        </p>
      </div>
    </div>
  );
}
