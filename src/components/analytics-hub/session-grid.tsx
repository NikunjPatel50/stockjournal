"use client";

import { useMemo } from "react";
import { HubPanel } from "@/components/analytics-hub/hub-panel";
import {
  computeHeatmap,
  formatMoney,
  type HeatCell,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const SESSIONS = ["Open", "Midday", "Power Hour"] as const;

type SessionGridProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

function cellLookup(cells: HeatCell[]) {
  const map = new Map<string, HeatCell>();
  for (const c of cells) map.set(`${c.day}|${c.session}`, c);
  return map;
}

function heatColor(pnl: number, maxAbs: number): string {
  if (pnl === 0) return "bg-muted/50";
  const t = Math.min(1, Math.abs(pnl) / maxAbs);
  if (pnl > 0) {
    if (t > 0.66) return "bg-emerald-500";
    if (t > 0.33) return "bg-emerald-500/60";
    return "bg-emerald-500/30";
  }
  if (t > 0.66) return "bg-rose-500";
  if (t > 0.33) return "bg-rose-500/60";
  return "bg-rose-500/30";
}

export function SessionGrid({ trades, currency }: SessionGridProps) {
  const cells = useMemo(() => computeHeatmap(trades), [trades]);
  const lookup = useMemo(() => cellLookup(cells), [cells]);
  const maxAbs = useMemo(
    () => Math.max(1, ...cells.map((c) => Math.abs(c.pnl))),
    [cells]
  );
  const hasData = cells.some((c) => c.trades > 0);

  return (
    <HubPanel
      title="When you trade best"
      subtitle="Weekday × session heatmap (entry/exit time)"
      accent="amber"
    >
      {!hasData ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No weekday session data yet.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[4.5rem_repeat(3,1fr)] gap-1.5 text-[10px] font-medium text-muted-foreground">
            <span />
            {SESSIONS.map((s) => (
              <span key={s} className="text-center">
                {s}
              </span>
            ))}
          </div>
          {DAYS.map((day) => (
            <div
              key={day}
              className="grid grid-cols-[4.5rem_repeat(3,1fr)] items-center gap-1.5"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {day}
              </span>
              {SESSIONS.map((session) => {
                const cell = lookup.get(`${day}|${session}`)!;
                const title = `${day} · ${session}: ${cell.trades} trade${
                  cell.trades === 1 ? "" : "s"
                } · ${formatMoney(cell.pnl, true, currency)}`;

                return (
                  <div
                    key={session}
                    title={title}
                    className={cn(
                      "flex h-12 cursor-default items-center justify-center rounded-lg text-[10px] font-medium ring-1 ring-border/30 transition-transform hover:scale-[1.02]",
                      heatColor(cell.pnl, maxAbs),
                      cell.trades === 0 && "text-muted-foreground"
                    )}
                  >
                    {cell.trades > 0
                      ? formatMoney(cell.pnl, true, currency)
                      : "—"}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </HubPanel>
  );
}
