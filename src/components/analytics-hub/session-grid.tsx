"use client";

import { useMemo } from "react";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import { computeHeatmap, formatMoney, type HeatCell } from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const SESSIONS = ["Open", "Midday", "Power Hour"] as const;

type SessionGridProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

function heatClass(pnl: number, trades: number, maxAbs: number): string {
  if (trades === 0) return "bg-muted/20 text-muted-foreground/60";
  if (pnl === 0) return "bg-muted/40";
  const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
  const tier = intensity > 0.66 ? 3 : intensity > 0.33 ? 2 : 1;
  if (pnl > 0) {
    return cn(
      "text-emerald-700 dark:text-emerald-300",
      tier === 3
        ? "bg-emerald-500/35"
        : tier === 2
          ? "bg-emerald-500/22"
          : "bg-emerald-500/12"
    );
  }
  return cn(
    "text-rose-700 dark:text-rose-300",
    tier === 3
      ? "bg-rose-500/35"
      : tier === 2
        ? "bg-rose-500/22"
        : "bg-rose-500/12"
  );
}

function totalClass(pnl: number) {
  if (pnl > 0) return "text-emerald-600 dark:text-emerald-400";
  if (pnl < 0) return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}

export function SessionGrid({ trades, currency }: SessionGridProps) {
  const cells = useMemo(() => computeHeatmap(trades), [trades]);

  const lookup = useMemo(() => {
    const map = new Map<string, HeatCell>();
    for (const cell of cells) map.set(`${cell.day}|${cell.session}`, cell);
    return map;
  }, [cells]);

  const maxAbs = useMemo(
    () => Math.max(1, ...cells.map((c) => Math.abs(c.pnl))),
    [cells]
  );

  const sessionTotals = useMemo(
    () =>
      SESSIONS.map((session) =>
        cells
          .filter((c) => c.session === session)
          .reduce((sum, c) => sum + c.pnl, 0)
      ),
    [cells]
  );

  const covered = cells.filter((c) => c.trades > 0).length;

  return (
    <DataPanel
      title="Session performance"
      subtitle="Weekday against session bucket, by realized P&L"
      meta={`${covered}/${DAYS.length * SESSIONS.length} slots`}
      footer="Sessions split at 11:30 and 14:30 local time using the closing timestamp."
    >
      {covered === 0 ? (
        <PanelEmpty
          title="No session coverage yet"
          hint="Closed weekday trades populate this grid once timestamps are recorded."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] border-separate border-spacing-[3px]">
            <thead>
              <tr>
                <th className="w-12" />
                {SESSIONS.map((session) => (
                  <th
                    key={session}
                    className="px-1 pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    {session}
                  </th>
                ))}
                <th className="w-24 px-1 pb-1 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Day
                </th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => {
                const dayCells = SESSIONS.map(
                  (session) => lookup.get(`${day}|${session}`)!
                );
                const dayTotal = dayCells.reduce((sum, c) => sum + c.pnl, 0);

                return (
                  <tr key={day}>
                    <th className="pr-2 text-right text-[11px] font-medium text-muted-foreground">
                      {day}
                    </th>
                    {dayCells.map((cell) => (
                      <td
                        key={cell.session}
                        title={`${day} · ${cell.session}: ${cell.trades} trade${
                          cell.trades === 1 ? "" : "s"
                        } · ${formatMoney(cell.pnl, true, currency)}`}
                        className={cn(
                          "h-10 rounded-md px-2 text-center text-[11px] font-medium",
                          NUMERIC_CLASS,
                          heatClass(cell.pnl, cell.trades, maxAbs)
                        )}
                      >
                        {cell.trades > 0
                          ? formatMoney(cell.pnl, true, currency)
                          : "—"}
                      </td>
                    ))}
                    <td
                      className={cn(
                        "px-1 text-right text-[11px] font-semibold",
                        NUMERIC_CLASS,
                        totalClass(dayTotal)
                      )}
                    >
                      {dayTotal === 0
                        ? "—"
                        : formatMoney(dayTotal, true, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th className="pr-2 pt-1 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  All
                </th>
                {sessionTotals.map((total, i) => (
                  <td
                    key={SESSIONS[i]}
                    className={cn(
                      "pt-1 text-center text-[11px] font-semibold",
                      NUMERIC_CLASS,
                      totalClass(total)
                    )}
                  >
                    {total === 0 ? "—" : formatMoney(total, true, currency)}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </DataPanel>
  );
}
