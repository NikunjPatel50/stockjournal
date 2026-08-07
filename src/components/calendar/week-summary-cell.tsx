"use client";

import type { CurrencyCode } from "@/lib/settings";
import { formatMoney, type MonthCalendarWeek } from "@/lib/analytics";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

type WeekSummaryCellProps = {
  week: MonthCalendarWeek;
  weekIndex: number;
  currency: CurrencyCode;
};

function pnlToneClass(pnl: number) {
  if (pnl === 0) return "text-muted-foreground";
  return pnl > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
}

function weekRangeLabel(week: MonthCalendarWeek) {
  const inMonth = week.days.filter((day) => day.inMonth);
  if (inMonth.length === 0) return null;
  if (inMonth.length === 1) return String(inMonth[0].dayOfMonth);
  return `${inMonth[0].dayOfMonth}–${inMonth[inMonth.length - 1].dayOfMonth}`;
}

function weekSurfaceClass(weekPnl: number, hasActivity: boolean) {
  if (!hasActivity) return "border-border/40 bg-muted/15";
  if (weekPnl > 0) return "border-emerald-500/25 bg-emerald-500/[0.07]";
  if (weekPnl < 0) return "border-rose-500/25 bg-rose-500/[0.07]";
  return "border-border/50 bg-muted/25";
}

function weekAccentClass(weekPnl: number, hasActivity: boolean) {
  if (!hasActivity) return "bg-border/80";
  if (weekPnl > 0) return "bg-emerald-500";
  if (weekPnl < 0) return "bg-rose-500";
  return "bg-muted-foreground/40";
}

export function WeekSummaryCell({
  week,
  weekIndex,
  currency,
}: WeekSummaryCellProps) {
  const hasActivity = week.activeDays > 0;
  const range = weekRangeLabel(week);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-md border-2 px-2 py-1.5 text-center",
        weekSurfaceClass(week.weekPnl, hasActivity)
      )}
    >
      <span
        className={cn(
          "absolute inset-y-1 left-0 w-[3px] rounded-r-full",
          weekAccentClass(week.weekPnl, hasActivity)
        )}
        aria-hidden
      />

      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          W{weekIndex + 1}
        </span>
        {range ? (
          <span className="text-[9px] font-medium tabular-nums text-muted-foreground/80">
            {range}
          </span>
        ) : null}
      </div>

      <p
        className={cn(
          "mt-1 text-[11px] font-semibold leading-tight sm:text-xs",
          NUMERIC_DISPLAY_CLASS,
          hasActivity ? pnlToneClass(week.weekPnl) : "text-muted-foreground/70"
        )}
      >
        {hasActivity ? formatMoney(week.weekPnl, true, currency) : "—"}
      </p>

      {hasActivity ? (
        <div className="mt-1 flex items-center justify-center gap-1">
          <div className="flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: Math.min(week.activeDays, 5) }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "size-1 rounded-full",
                  week.weekPnl > 0
                    ? "bg-emerald-500/80"
                    : week.weekPnl < 0
                      ? "bg-rose-500/80"
                      : "bg-muted-foreground/50"
                )}
              />
            ))}
            {week.activeDays > 5 ? (
              <span className="text-[8px] text-muted-foreground">+</span>
            ) : null}
          </div>
          <span className="text-[9px] font-medium text-muted-foreground">
            {week.activeDays}d
          </span>
        </div>
      ) : (
        <span className="mt-1 text-[9px] text-muted-foreground/60">No trades</span>
      )}
    </div>
  );
}

export function WeekSummaryHeader() {
  return (
    <div className="flex flex-col items-center justify-center px-1 py-2 text-center leading-tight">
      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
        WK
      </span>
      <span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground/70">
        total
      </span>
    </div>
  );
}
