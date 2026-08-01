"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { HubPanel } from "@/components/analytics-hub/hub-panel";
import {
  computePnlCalendar,
  formatMoney,
  type PnlCalendarData,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn } from "@/lib/utils";

type PnlCalendarProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

function cellIntensity(pnl: number | null, maxAbs: number): number {
  if (pnl === null) return 0;
  if (pnl === 0) return 0.08;
  return Math.min(1, Math.abs(pnl) / maxAbs);
}

function cellClass(pnl: number | null, intensity: number): string {
  if (pnl === null) return "bg-muted/40";
  if (pnl === 0) return "bg-muted/60";
  if (pnl > 0) {
    if (intensity > 0.66) return "bg-emerald-500";
    if (intensity > 0.33) return "bg-emerald-500/70";
    return "bg-emerald-500/40";
  }
  if (intensity > 0.66) return "bg-rose-500";
  if (intensity > 0.33) return "bg-rose-500/70";
  return "bg-rose-500/40";
}

function CalendarGrid({
  data,
  currency,
}: {
  data: PnlCalendarData;
  currency: CurrencyCode;
}) {
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <div className="flex flex-col gap-[3px] pt-5 text-[9px] text-muted-foreground">
        {dayLabels.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className={cn(
              "flex h-[11px] items-center leading-none",
              i % 2 === 0 ? "opacity-100" : "opacity-0"
            )}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 gap-[3px]">
        {data.weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => {
              const intensity = cellIntensity(day.pnl, data.maxAbsPnl);
              const label = format(parseISO(day.date), "EEE, MMM d");
              const pnlLabel =
                day.pnl === null
                  ? "No trades"
                  : formatMoney(day.pnl, true, currency);
              const title = `${label}: ${pnlLabel}${
                day.trades > 0
                  ? ` · ${day.trades} trade${day.trades === 1 ? "" : "s"}`
                  : ""
              }`;

              return (
                <div
                  key={day.date}
                  title={title}
                  className={cn(
                    "size-[11px] cursor-default rounded-[2px] ring-1 ring-border/20 transition-transform hover:scale-125",
                    cellClass(day.pnl, intensity)
                  )}
                  aria-label={title}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PnlCalendar({ trades, currency }: PnlCalendarProps) {
  const data = useMemo(() => computePnlCalendar(trades), [trades]);
  const activeDays = useMemo(
    () => data.weeks.flat().filter((d) => d.pnl !== null).length,
    [data]
  );

  return (
    <HubPanel
      title="Daily P&L rhythm"
      subtitle="26-week calendar — greener is profit, redder is loss"
      accent="emerald"
    >
      {activeDays === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No closed trades in this period to map.
        </p>
      ) : (
        <>
          <CalendarGrid data={data} currency={currency} />
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <span className="size-3 rounded-[2px] bg-muted/40" />
              <span className="size-3 rounded-[2px] bg-rose-500/40" />
              <span className="size-3 rounded-[2px] bg-rose-500/70" />
              <span className="size-3 rounded-[2px] bg-rose-500" />
            </div>
            <div className="flex gap-1">
              <span className="size-3 rounded-[2px] bg-emerald-500/40" />
              <span className="size-3 rounded-[2px] bg-emerald-500/70" />
              <span className="size-3 rounded-[2px] bg-emerald-500" />
            </div>
            <span>More</span>
          </div>
        </>
      )}
    </HubPanel>
  );
}
