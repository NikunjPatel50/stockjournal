"use client";

import { useMemo } from "react";
import { Tag } from "lucide-react";
import { HubPanel } from "@/components/analytics-hub/hub-panel";
import {
  computeTagMetrics,
  formatMoney,
  formatPercent,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type TagRankingsProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

export function TagRankings({ trades, currency }: TagRankingsProps) {
  const tags = useMemo(() => computeTagMetrics(trades), [trades]);
  const top = tags.slice(0, 8);

  return (
    <HubPanel
      title="Tag performance"
      subtitle="Which labels correlate with your best and worst outcomes"
    >
      {top.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Add tags to trades to see tag-level analytics.
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {top.map((row) => {
            const positive = row.totalPnl >= 0;
            return (
              <div
                key={row.tag}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                    <Tag className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.tag}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.trades} trades · {formatPercent(row.winRate)} win
                      {row.avgR !== null ? ` · ${row.avgR}R avg` : ""}
                    </p>
                  </div>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-sm font-semibold",
                    NUMERIC_CLASS,
                    positive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatMoney(row.totalPnl, true, currency)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </HubPanel>
  );
}
