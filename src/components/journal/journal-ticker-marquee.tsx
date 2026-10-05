"use client";

import { useEffect, useRef } from "react";
import {
  formatIndexPriceChange,
  formatIndexPriceCompact,
} from "@/lib/major-market-indices";
import {
  JOURNAL_TICKER_INSTRUMENTS,
  type JournalTickerQuote,
} from "@/lib/journal-ticker";
import { useJournalTicker } from "@/hooks/use-journal-ticker";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";

function TickerItem({
  label,
  quote,
  pending,
}: {
  label: string;
  quote?: JournalTickerQuote;
  pending: boolean;
}) {
  const change = quote?.changePercent;
  const priceChange = quote?.change ?? null;
  const up = (priceChange ?? change ?? 0) > 0;
  const down = (priceChange ?? change ?? 0) < 0;
  const changeClass = cn(
    "text-xs font-medium",
    NUMERIC_DISPLAY_CLASS,
    up && "text-emerald-600 dark:text-emerald-400",
    down && "text-rose-600 dark:text-rose-400",
    !up && !down && "text-muted-foreground"
  );

  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 px-5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </span>
      {quote ? (
        <>
          <span
            className={cn(
              "text-sm font-semibold text-foreground",
              NUMERIC_DISPLAY_CLASS
            )}
          >
            {formatIndexPriceCompact(quote.price, quote.currency, 2)}
          </span>
          {priceChange != null ? (
            <span className={changeClass}>
              {formatIndexPriceChange(priceChange, quote.currency)}
            </span>
          ) : null}
          {change != null ? (
            <span className={changeClass}>
              {change > 0 ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          ) : null}
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
            {quote.sessionOpen ? "Live" : "Close"}
          </span>
        </>
      ) : pending ? (
        <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )}
    </span>
  );
}

function TickerSequence({
  quotes,
  loading,
  hidden,
}: {
  quotes: JournalTickerQuote[];
  loading: boolean;
  hidden?: boolean;
}) {
  const byId = new Map(quotes.map((quote) => [quote.id, quote]));

  return (
    <span className="inline-flex items-center" aria-hidden={hidden || undefined}>
      {JOURNAL_TICKER_INSTRUMENTS.map((instrument) => (
        <TickerItem
          key={instrument.id}
          label={instrument.label}
          quote={byId.get(instrument.id)}
          pending={loading}
        />
      ))}
    </span>
  );
}

const MARQUEE_LOOP_MS = 42_000;

export function JournalTickerMarquee() {
  const { quotes, loading } = useJournalTicker();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = performance.now();
    let pos = 0;

    const step = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const half = el.scrollWidth / 2;
      if (!pausedRef.current && half > 1) {
        pos = (pos + (half / MARQUEE_LOOP_MS) * dt) % half;
        el.scrollLeft = pos;
      }
      raf = window.requestAnimationFrame(step);
    };

    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="journal-ticker relative border-y border-border/70 bg-muted/15"
      aria-label="Market prices"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onFocus={() => {
        pausedRef.current = true;
      }}
      onBlur={() => {
        pausedRef.current = false;
      }}
    >
      <div
        ref={scrollerRef}
        className="w-full overflow-x-hidden"
      >
        <div className="flex w-max items-center py-3.5">
          <TickerSequence
            quotes={quotes}
            loading={loading && quotes.length === 0}
          />
          <TickerSequence
            quotes={quotes}
            loading={loading && quotes.length === 0}
            hidden
          />
        </div>
      </div>
    </div>
  );
}
