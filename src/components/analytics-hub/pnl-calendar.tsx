"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { DataPanel, PanelEmpty } from "@/components/data-panel";
import {
  computePnlCalendar,
  formatMoney,
  type PnlCalendarData,
} from "@/lib/analytics";
import type { CurrencyCode } from "@/lib/settings";
import type { JournalTrade } from "@/lib/journal-types";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

type PnlCalendarProps = {
  trades: JournalTrade[];
  currency: CurrencyCode;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function cellClass(pnl: number | null, maxAbs: number): string {
  if (pnl === null) return "bg-muted/35";
  if (pnl === 0) return "bg-muted/70";
  const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
  const tier = intensity > 0.66 ? 3 : intensity > 0.33 ? 2 : 1;
  if (pnl > 0) {
    return tier === 3
      ? "bg-emerald-500"
      : tier === 2
        ? "bg-emerald-500/65"
        : "bg-emerald-500/35";
  }
  return tier === 3
    ? "bg-rose-500"
    : tier === 2
      ? "bg-rose-500/65"
      : "bg-rose-500/35";
}

/** One label per week column, shown only when the month changes. */
function monthLabels(data: PnlCalendarData): (string | null)[] {
  let previous = "";
  return data.weeks.map((week) => {
    const first = week[0];
    if (!first) return null;
    const month = format(parseISO(first.date), "MMM");
    if (month === previous) return null;
    previous = month;
    return month;
  });
}

export function PnlCalendar({ trades, currency }: PnlCalendarProps) {
  const data = useMemo(() => computePnlCalendar(trades), [trades]);
  const months = useMemo(() => monthLabels(data), [data]);

  const summary = useMemo(() => {
    const days = data.weeks.flat().filter((d) => d.pnl !== null);
    if (days.length === 0) return null;
    const best = days.reduce((a, b) => (b.pnl! > a.pnl! ? b : a));
    const worst = days.reduce((a, b) => (b.pnl! < a.pnl! ? b : a));
    return { count: days.length, best, worst };
  }, [data]);

  return (
    <DataPanel
      title="Daily P&L rhythm"
      subtitle="Trailing 26 weeks of realized results, one cell per day"
      meta={summary ? `${summary.count} active days` : "No activity"}
      footer={
        summary
          ? `Best day ${formatMoney(summary.best.pnl!, true, currency)} on ${format(parseISO(summary.best.date), "MMM d")} · Worst day ${formatMoney(summary.worst.pnl!, true, currency)} on ${format(parseISO(summary.worst.date), "MMM d")}.`
          : undefined
      }
    >
      {!summary ? (
        <PanelEmpty
          title="No closed trades to map"
          hint="Daily cells appear once trades are closed within the trailing 26 weeks."
        />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              <div className="flex flex-col gap-[3px] pt-[18px] text-[9px] text-muted-foreground">
                {DAY_LABELS.map((label, i) => (
                  <span
                    key={`${label}-${i}`}
                    className={cn(
                      "flex h-[11px] items-center leading-none",
                      i % 2 === 1 ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex gap-[3px]">
                {data.weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    <span className="h-[15px] text-[9px] leading-none text-muted-foreground">
                      {months[wi] ?? ""}
                    </span>
                    {week.map((day) => {
                      const pnlLabel =
                        day.pnl === null
                          ? "No trades"
                          : formatMoney(day.pnl, true, currency);
                      const title = `${format(parseISO(day.date), "EEE, MMM d")}: ${pnlLabel}${
                        day.trades > 0
                          ? ` · ${day.trades} trade${day.trades === 1 ? "" : "s"}`
                          : ""
                      }`;

                      return (
                        <div
                          key={day.date}
                          title={title}
                          aria-label={title}
                          className={cn(
                            "size-[11px] cursor-default rounded-[2px] ring-1 ring-inset ring-foreground/[0.06]",
                            cellClass(day.pnl, data.maxAbsPnl)
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <span className={NUMERIC_CLASS}>
              Loss {formatMoney(-data.maxAbsPnl, true, currency)}
            </span>
            <div className="flex gap-[3px]">
              <span className="size-[11px] rounded-[2px] bg-rose-500" />
              <span className="size-[11px] rounded-[2px] bg-rose-500/65" />
              <span className="size-[11px] rounded-[2px] bg-rose-500/35" />
              <span className="size-[11px] rounded-[2px] bg-muted/35 ring-1 ring-inset ring-border/60" />
              <span className="size-[11px] rounded-[2px] bg-emerald-500/35" />
              <span className="size-[11px] rounded-[2px] bg-emerald-500/65" />
              <span className="size-[11px] rounded-[2px] bg-emerald-500" />
            </div>
            <span className={NUMERIC_CLASS}>
              Profit {formatMoney(data.maxAbsPnl, true, currency)}
            </span>
          </div>
        </div>
      )}
    </DataPanel>
  );
}
