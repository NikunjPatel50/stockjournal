"use client";

import { Fragment } from "react";
import { format, isToday, parseISO } from "date-fns";
import type { MonthPnlCalendarData } from "@/lib/analytics";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

const MINI_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const WEEK_ROWS = 6;

export type YearMiniMonth = {
  month: number;
  label: string;
  monthPnl: number;
  weeks: MonthPnlCalendarData["weeks"];
};

type YearMiniCalendarGridProps = {
  months: YearMiniMonth[];
  onSelectMonth: (month: number) => void;
  className?: string;
};

function formatCompactPnl(value: number) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return String(rounded);
  return "0";
}

function miniDayClass(pnl: number | null, inMonth: boolean, isCurrentDay: boolean) {
  if (!inMonth) return "text-transparent";
  if (isCurrentDay) return "bg-muted text-foreground ring-1 ring-border";
  if (pnl == null) return "text-muted-foreground";
  if (pnl > 0) return "bg-emerald-500/35 font-semibold text-emerald-950 dark:bg-emerald-500/40 dark:text-emerald-50";
  if (pnl < 0) return "bg-rose-500/35 font-semibold text-rose-950 dark:bg-rose-500/40 dark:text-rose-50";
  return "text-muted-foreground";
}

function monthActivity(month: YearMiniMonth) {
  const inMonthDays = month.weeks.flatMap((week) =>
    week.days.filter((day) => day.inMonth)
  );
  const activeDays = inMonthDays.filter((day) => day.trades > 0).length;
  const trades = inMonthDays.reduce((sum, day) => sum + day.trades, 0);
  const profitDays = inMonthDays.filter((day) => (day.pnl ?? 0) > 0).length;
  const lossDays = inMonthDays.filter((day) => (day.pnl ?? 0) < 0).length;

  return { activeDays, trades, profitDays, lossDays };
}

export function YearMiniCalendarGrid({
  months,
  onSelectMonth,
  className,
}: YearMiniCalendarGridProps) {
  return (
    <div
      className={cn(
        "grid h-full grid-cols-3 gap-2.5 md:grid-cols-4 lg:grid-cols-6 lg:grid-rows-2",
        className
      )}
    >
      {months.map((month) => {
        const hasPnl = month.monthPnl !== 0;
        const activity = monthActivity(month);
        const toneDays = activity.profitDays + activity.lossDays;

        return (
          <button
            key={month.month}
            type="button"
            onClick={() => onSelectMonth(month.month)}
            className="flex h-full min-h-0 flex-col rounded-lg border border-border/80 bg-muted/20 p-2 text-left transition-colors hover:border-emerald-500/40 hover:bg-muted/40"
          >
            <div className="flex shrink-0 items-start justify-between gap-1.5">
              <p className="text-[10px] font-bold tracking-[0.12em] text-foreground">
                {month.label}
              </p>
              {hasPnl ? (
                <span
                  className={cn(
                    "shrink-0 text-[9px] font-semibold",
                    NUMERIC_DISPLAY_CLASS,
                    month.monthPnl > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatCompactPnl(month.monthPnl)}
                </span>
              ) : null}
            </div>

            <div className="mt-1.5 grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-0.5">
              {MINI_WEEKDAYS.map((label, index) => (
                <div
                  key={`${month.month}-wd-${index}`}
                  className="flex items-end justify-center pb-0.5 text-[8px] font-medium leading-none text-muted-foreground/70"
                >
                  {label}
                </div>
              ))}

              {Array.from({ length: WEEK_ROWS }, (_, weekIndex) => {
                const week = month.weeks[weekIndex];
                if (!week) {
                  return (
                    <Fragment key={`${month.month}-empty-week-${weekIndex}`}>
                      {Array.from({ length: 7 }, (_, dayIndex) => (
                        <div
                          key={`${month.month}-empty-day-${weekIndex}-${dayIndex}`}
                          className="min-h-0 rounded-[2px]"
                          aria-hidden
                        />
                      ))}
                    </Fragment>
                  );
                }

                return (
                  <Fragment key={`${month.month}-week-${weekIndex}`}>
                    {week.days.map((day) => {
                      const isCurrentDay =
                        day.inMonth && isToday(parseISO(day.date));
                      return (
                        <div
                          key={day.date}
                          className={cn(
                            "flex h-full min-h-0 items-center justify-center rounded-[3px] text-[9px] leading-none sm:text-[10px]",
                            miniDayClass(day.pnl, day.inMonth, isCurrentDay)
                          )}
                          title={
                            day.inMonth && day.trades > 0
                              ? `${format(parseISO(day.date), "MMM d")}: ${day.pnl}`
                              : undefined
                          }
                        >
                          {day.inMonth ? day.dayOfMonth : ""}
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>

            <div className="mt-2 shrink-0 space-y-1.5 border-t border-border/60 pt-2">
              {activity.trades > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-[9px] leading-none text-muted-foreground">
                    <span>
                      {activity.activeDays} active day
                      {activity.activeDays === 1 ? "" : "s"}
                    </span>
                    <span>
                      {activity.trades} trade{activity.trades === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    {activity.profitDays > 0 ? (
                      <div
                        className="bg-emerald-500"
                        style={{
                          width: `${(activity.profitDays / toneDays) * 100}%`,
                        }}
                      />
                    ) : null}
                    {activity.lossDays > 0 ? (
                      <div
                        className="bg-rose-500"
                        style={{
                          width: `${(activity.lossDays / toneDays) * 100}%`,
                        }}
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-center text-[9px] leading-none text-muted-foreground/80">
                  No closed trades
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
