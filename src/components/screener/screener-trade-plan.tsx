"use client";

import { ScreenerSortHead } from "@/components/screener/screener-column-sort";
import { TableCell } from "@/components/ui/table";
import { formatMarketPrice } from "@/lib/journal-types";
import type { ColumnSort } from "@/lib/screener/column-sort";
import type { TradePlan } from "@/lib/screener/trade-plan";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

function entryText(plan: TradePlan): string {
  const price = formatMarketPrice(plan.entry, "INR");
  if (plan.action === "now") return `Enter now · ${price}`;
  if (plan.action === "pullback") return `Pull back to ${price}`;
  return `Buy above ${price}`;
}

function strengthTone(strength: number): { text: string; bar: string } {
  if (strength >= 70) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
    };
  }
  if (strength >= 50) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
    };
  }
  return {
    text: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
  };
}

export function ScreenerPlanHeads<K extends string>({
  planKey,
  strengthKey,
  sort,
  onSort,
}: {
  planKey: K;
  strengthKey: K;
  sort: ColumnSort<K> | null;
  onSort: (key: K) => void;
}) {
  return (
    <>
      <ScreenerSortHead
        label="Plan"
        title="When to enter, the stop, and the profit target"
        active={sort?.key === planKey}
        direction={sort?.direction ?? "desc"}
        onClick={() => onSort(planKey)}
      />
      <ScreenerSortHead
        label="Strength"
        title="How many trend, RSI, candle, volume, and reward checks this setup passes"
        align="right"
        active={sort?.key === strengthKey}
        direction={sort?.direction ?? "desc"}
        onClick={() => onSort(strengthKey)}
      />
    </>
  );
}

export function ScreenerPlanCells({
  plan,
  showFrame = false,
}: {
  plan: TradePlan | null | undefined;
  showFrame?: boolean;
}) {
  if (!plan) {
    return (
      <>
        <TableCell className="px-2.5 py-2.5 text-sm text-muted-foreground">
          —
        </TableCell>
        <TableCell
          className={cn(
            "px-2.5 py-2.5 text-right text-sm text-muted-foreground",
            NUMERIC_CLASS
          )}
        >
          —
        </TableCell>
      </>
    );
  }

  const tone = strengthTone(plan.strength);
  const headline = showFrame
    ? `${plan.frame} · ${entryText(plan)}`
    : entryText(plan);

  return (
    <>
      <TableCell className="max-w-[18rem] px-2.5 py-2.5" title={plan.breakdown}>
        <p className="text-sm font-medium text-foreground">{headline}</p>
        <p className={cn("text-[11px] text-muted-foreground", NUMERIC_CLASS)}>
          SL {formatMarketPrice(plan.stop, "INR")} · Target{" "}
          {formatMarketPrice(plan.target, "INR")} · 1:
          {plan.rewardRisk.toFixed(1)}
        </p>
        {plan.patterns.length > 0 ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {plan.patterns.join(" · ")}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="px-2.5 py-2.5 text-right" title={plan.breakdown}>
        <div className="ml-auto flex w-14 flex-col items-end gap-1">
          <span className={cn("text-sm font-semibold", NUMERIC_CLASS, tone.text)}>
            {plan.strength}%
          </span>
          <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <span
              className={cn("block h-full rounded-full", tone.bar)}
              style={{ width: `${plan.strength}%` }}
            />
          </span>
        </div>
      </TableCell>
    </>
  );
}
