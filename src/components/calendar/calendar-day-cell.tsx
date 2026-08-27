"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import { formatMoney, tradeRMultiple } from "@/lib/analytics";
import type { MonthCalendarDay } from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

const POPOVER_WIDTH = 300;
const VIEWPORT_PADDING = 12;
const GAP_PX = 10;

type HoverAnchor = {
  date: string;
  rect: DOMRect;
};

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

function tradeDetailPnlClass(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}

function directionBadgeClass(direction: JournalTrade["direction"]) {
  return direction === "Long"
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    : "bg-sky-500/15 text-sky-700 dark:text-sky-400";
}

function formatDayLabel(date: string) {
  try {
    return format(parseISO(date), "EEE, MMM d");
  } catch {
    return date;
  }
}

function TradeHoverRow({
  trade,
  currency,
}: {
  trade: JournalTrade;
  currency: CurrencyCode;
}) {
  const rMultiple = tradeRMultiple(trade);

  return (
    <li className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            directionBadgeClass(trade.direction)
          )}
        >
          {trade.direction}
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
          {trade.ticker}
        </p>
        <p
          className={cn(
            "shrink-0 text-xs font-semibold tabular-nums",
            NUMERIC_DISPLAY_CLASS,
            tradeDetailPnlClass(trade.pnl)
          )}
        >
          {formatMoney(trade.pnl, true, currency)}
        </p>
      </div>
      <div className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
        <span className={cn("tabular-nums", NUMERIC_DISPLAY_CLASS)}>
          {formatMoney(trade.entryPrice, false, currency)}
        </span>
        <ArrowRight className="size-3 shrink-0 opacity-60" aria-hidden />
        <span className={cn("tabular-nums", NUMERIC_DISPLAY_CLASS)}>
          {formatMoney(trade.exitPrice, false, currency)}
        </span>
        {trade.quantity > 0 ? (
          <>
            <span className="text-border">·</span>
            <span className={NUMERIC_DISPLAY_CLASS}>{trade.quantity} sh</span>
          </>
        ) : null}
        {rMultiple != null ? (
          <>
            <span className="text-border">·</span>
            <span className={NUMERIC_DISPLAY_CLASS}>{rMultiple.toFixed(2)}R</span>
          </>
        ) : null}
        {trade.strategy ? (
          <>
            <span className="hidden text-border sm:inline">·</span>
            <span className="hidden min-w-0 truncate sm:inline">
              {trade.strategy}
            </span>
          </>
        ) : null}
      </div>
    </li>
  );
}

function CalendarDayTradePopover({
  anchor,
  trades,
  currency,
}: {
  anchor: HoverAnchor;
  trades: JournalTrade[];
  currency: CurrencyCode;
}) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: POPOVER_WIDTH,
    showAbove: false,
  });

  const netPnl = useMemo(
    () =>
      Math.round(trades.reduce((sum, trade) => sum + trade.pnl, 0) * 100) / 100,
    [trades]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const width = Math.min(
      POPOVER_WIDTH,
      window.innerWidth - VIEWPORT_PADDING * 2
    );
    const centerX = anchor.rect.left + anchor.rect.width / 2;
    let left = centerX - width / 2;
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, window.innerWidth - width - VIEWPORT_PADDING)
    );

    const spaceBelow = window.innerHeight - anchor.rect.bottom;
    const showAbove = spaceBelow < 220;
    const top = showAbove
      ? anchor.rect.top - GAP_PX
      : anchor.rect.bottom + GAP_PX;

    setPosition({ top, left, width, showAbove });
  }, [anchor]);

  if (!mounted || trades.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-50"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        transform: position.showAbove ? "translateY(-100%)" : undefined,
      }}
      role="tooltip"
    >
      <div className="overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/25 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">
              {formatDayLabel(anchor.date)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {trades.length} trade{trades.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Net P&L
            </p>
            <p
              className={cn(
                "mt-0.5 text-sm font-semibold tabular-nums",
                NUMERIC_DISPLAY_CLASS,
                tradeDetailPnlClass(netPnl)
              )}
            >
              {formatMoney(netPnl, true, currency)}
            </p>
          </div>
        </div>

        <ul className="space-y-1.5 p-2">
          {trades.map((trade) => (
            <TradeHoverRow key={trade.id} trade={trade} currency={currency} />
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}

export function CalendarDayCell({
  day,
  trades,
  currency,
}: {
  day: MonthCalendarDay;
  trades: JournalTrade[];
  currency: CurrencyCode;
}) {
  const [hoverAnchor, setHoverAnchor] = useState<HoverAnchor | null>(null);
  const hasTrades = day.trades > 0 && trades.length > 0;

  return (
    <>
      <div
        className={cn(
          "flex h-full min-h-0 flex-col items-center justify-center rounded-lg border-2 border-border p-2 text-center transition-shadow",
          pnlCellBackground(day.pnl, day.inMonth),
          hasTrades && "cursor-default hover:z-10 hover:shadow-md"
        )}
        onMouseEnter={(event) => {
          if (!hasTrades) return;
          setHoverAnchor({
            date: day.date,
            rect: event.currentTarget.getBoundingClientRect(),
          });
        }}
        onMouseLeave={() => setHoverAnchor(null)}
      >
        <span
          className={cn(
            "text-xs font-medium",
            day.inMonth ? "text-foreground" : "text-muted-foreground/50"
          )}
        >
          {day.dayOfMonth}
        </span>
        {hasTrades ? (
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

      {hoverAnchor ? (
        <CalendarDayTradePopover
          anchor={hoverAnchor}
          trades={trades}
          currency={currency}
        />
      ) : null}
    </>
  );
}
