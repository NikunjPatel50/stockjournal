"use client";

import { Fragment, useMemo, useState } from "react";
import {
  addMonths,
  format,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRegionTrades } from "@/components/journal/journal-market-provider";
import { MacroSummaryTable } from "@/components/calendar/macro-summary-table";
import { YearMiniCalendarGrid } from "@/components/calendar/year-mini-calendar-grid";
import {
  WeekSummaryCell,
  WeekSummaryHeader,
} from "@/components/calendar/week-summary-cell";
import { AppPageHeader } from "@/components/app-page-header";
import {
  computeMonthPnlCalendar,
  computeYearMacroSummary,
  computeYearPnlSummary,
  filterClosedTrades,
  formatMoney,
} from "@/lib/analytics";
import { APP_PAGE_SHELL_CLASS } from "@/lib/app-shell";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

type ViewMode = "monthly" | "yearly";

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

/** Shared slot height so monthly and yearly views keep the main card size stable. */
const CALENDAR_BODY_HEIGHT_CLASS = "h-[34rem] sm:h-[38rem]";

const MONTHLY_WEEK_ROWS = 6;

function pnlToneClass(pnl: number | null) {
  if (pnl == null || pnl === 0) return "text-muted-foreground";
  return pnl > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
}

function pnlCellBackground(pnl: number | null, inMonth: boolean) {
  if (!inMonth) return "bg-muted/20";
  if (pnl == null) return "bg-card";
  if (pnl > 0) return "bg-emerald-500/10";
  if (pnl < 0) return "bg-rose-500/10";
  return "bg-card";
}

function CalendarStatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md border-2 border-border bg-muted/20 px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold text-foreground",
          NUMERIC_DISPLAY_CLASS,
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PnlCalendarView() {
  const { trades, currency } = useRegionTrades();

  const closedTrades = useMemo(() => filterClosedTrades(trades), [trades]);

  const [view, setView] = useState<ViewMode>("monthly");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const now = new Date();

  const yearOptions = useMemo(() => {
    const years = new Set<number>([now.getFullYear()]);
    for (const trade of closedTrades) {
      const date = trade.exitDate || trade.entryDate;
      if (date) years.add(new Date(date).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [closedTrades, now]);

  const monthData = useMemo(
    () => computeMonthPnlCalendar(closedTrades, year, month),
    [closedTrades, year, month]
  );

  const yearData = useMemo(
    () => computeYearPnlSummary(closedTrades, year),
    [closedTrades, year]
  );

  const macroSummary = useMemo(
    () => computeYearMacroSummary(closedTrades, year),
    [closedTrades, year]
  );

  const yearMiniMonths = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const cal = computeMonthPnlCalendar(closedTrades, year, monthIndex);
        return {
          month: monthIndex,
          label: format(new Date(year, monthIndex, 1), "MMMM").toUpperCase(),
          monthPnl: cal.monthPnl,
          weeks: cal.weeks,
        };
      }),
    [closedTrades, year]
  );

  const goToThisMonth = () => setCursor(startOfMonth(now));

  const shiftMonth = (delta: number) => {
    setCursor((prev) => startOfMonth(addMonths(prev, delta)));
  };

  const shiftYear = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear() + delta, prev.getMonth(), 1));
  };

  const periodLabel =
    view === "monthly"
      ? format(cursor, "MMMM yyyy").toUpperCase()
      : String(year);

  const headerPnl =
    view === "monthly" ? monthData.monthPnl : yearData.yearPnl;
  const headerActiveDays =
    view === "monthly" ? monthData.activeDays : yearData.activeDays;

  return (
    <div className={APP_PAGE_SHELL_CLASS}>
      <div className="space-y-4">
        <AppPageHeader
          eyebrow="Portfolio analytics"
          title="Calendar"
        />

        <div className="pl-12 lg:pl-0">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setView("monthly")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "monthly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setView("yearly")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "yearly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex min-h-[4.5rem] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(year)}
              onValueChange={(value) =>
                setCursor((prev) => new Date(Number(value), prev.getMonth(), 1))
              }
            >
              <SelectTrigger className="h-9 w-[5.5rem] text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {view === "monthly" ? (
              <>
                <div className="inline-flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => shiftMonth(-1)}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <p className="whitespace-nowrap px-1 text-center text-sm font-semibold tracking-wide text-foreground">
                    {periodLabel}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => shiftMonth(1)}
                    aria-label="Next month"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold uppercase tracking-wide"
                  onClick={goToThisMonth}
                  disabled={isSameMonth(cursor, now)}
                >
                  This month
                </Button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => shiftYear(-1)}
                    aria-label="Previous year"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <p className="whitespace-nowrap px-1 text-center text-sm font-semibold tracking-wide text-foreground">
                    {periodLabel}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => shiftYear(1)}
                    aria-label="Next year"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="pointer-events-none h-9 text-xs font-semibold uppercase tracking-wide opacity-0"
                  tabIndex={-1}
                  aria-hidden
                >
                  This month
                </Button>
              </>
            )}
          </div>

          <div className="grid min-w-[12rem] grid-cols-2 gap-2 sm:min-w-[16rem]">
            <CalendarStatCard
              label={view === "monthly" ? "Monthly stats" : "Year stats"}
              value={formatMoney(headerPnl, true, currency)}
              valueClassName={pnlToneClass(headerPnl)}
            />
            <CalendarStatCard
              label="Active days"
              value={String(headerActiveDays)}
            />
          </div>
        </div>

        <div className={cn("w-full", CALENDAR_BODY_HEIGHT_CLASS)}>
          {view === "monthly" ? (
            <div className="grid h-full w-full grid-cols-[repeat(7,minmax(0,1fr))_6.75rem] grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(7,minmax(0,1fr))_7.25rem]">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-1 py-2 text-center text-[10px] font-semibold tracking-widest text-muted-foreground"
                >
                  {label}
                </div>
              ))}
              <WeekSummaryHeader />

              {Array.from({ length: MONTHLY_WEEK_ROWS }, (_, weekIndex) => {
                const week = monthData.weeks[weekIndex];
                if (!week) {
                  return (
                    <Fragment key={`empty-week-${weekIndex}`}>
                      {Array.from({ length: 7 }, (_, dayIndex) => (
                        <div
                          key={`empty-day-${weekIndex}-${dayIndex}`}
                          className="min-h-0 rounded-lg border border-transparent"
                          aria-hidden
                        />
                      ))}
                      <div
                        className="min-h-0 rounded-lg border border-transparent"
                        aria-hidden
                      />
                    </Fragment>
                  );
                }

                return (
                  <Fragment key={`week-row-${weekIndex}`}>
                    {week.days.map((day) => (
                      <div
                        key={day.date}
                        className={cn(
                          "flex h-full min-h-0 flex-col items-center justify-center rounded-lg border-2 border-border p-2 text-center",
                          pnlCellBackground(day.pnl, day.inMonth)
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs font-medium",
                            day.inMonth
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          )}
                        >
                          {day.dayOfMonth}
                        </span>
                        {day.trades > 0 ? (
                          <div className="mt-1 space-y-0.5">
                            <p
                              className={cn(
                                "text-sm font-semibold leading-tight",
                                NUMERIC_DISPLAY_CLASS,
                                pnlToneClass(day.pnl)
                              )}
                            >
                              {formatMoney(day.pnl ?? 0, true, currency)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {day.trades} trade{day.trades === 1 ? "" : "s"}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <WeekSummaryCell
                      week={week}
                      weekIndex={weekIndex}
                      currency={currency}
                    />
                  </Fragment>
                );
              })}
            </div>
          ) : (
            <YearMiniCalendarGrid
              className="h-full"
              months={yearMiniMonths}
              onSelectMonth={(monthIndex) => {
                setCursor(new Date(year, monthIndex, 1));
                setView("monthly");
              }}
            />
          )}
        </div>
      </div>

      <MacroSummaryTable rows={macroSummary} currency={currency} year={year} />

      {closedTrades.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No closed trades yet.{" "}
          <Link
            href="/journal"
            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Log and close a trade
          </Link>{" "}
          to populate the calendar.
        </p>
      ) : null}
    </div>
  );
}
