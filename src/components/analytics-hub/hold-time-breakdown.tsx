"use client";

import { useMemo } from "react";
import { HubPanel } from "@/components/analytics-hub/hub-panel";
import {
  computeDurationBuckets,
  formatMoney,
  formatSignedPercent,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type HoldTimeBreakdownProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

export function HoldTimeBreakdown({ trades, currency }: HoldTimeBreakdownProps) {
  const buckets = useMemo(() => computeDurationBuckets(trades), [trades]);
  const maxTrades = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.trades)),
    [buckets]
  );
  const hasData = buckets.some((b) => b.trades > 0);

  return (
    <HubPanel
      title="Hold-time profile"
      subtitle="How duration affects returns and trade count"
      accent="emerald"
    >
      {!hasData ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hold-time data available.
        </p>
      ) : (
        <div className="space-y-4">
          {buckets.map((bucket) => {
            const width = (bucket.trades / maxTrades) * 100;
            const pnlUp = bucket.totalPnl > 0;
            const pnlDown = bucket.totalPnl < 0;

            return (
              <div key={bucket.bucket}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{bucket.bucket}</p>
                  <p className="text-xs text-muted-foreground">
                    {bucket.trades} trade{bucket.trades === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs">
                  <span
                    className={cn(
                      "font-medium",
                      NUMERIC_CLASS,
                      pnlUp && "text-emerald-600 dark:text-emerald-400",
                      pnlDown && "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {formatMoney(bucket.totalPnl, true, currency)} total
                  </span>
                  <span className={cn("text-muted-foreground", NUMERIC_CLASS)}>
                    {formatSignedPercent(bucket.avgReturn)} avg ROI
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </HubPanel>
  );
}
