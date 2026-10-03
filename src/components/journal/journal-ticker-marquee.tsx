"use client";

import {
  computeIndexPriceChange,
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
  const priceChange =
    quote != null ? computeIndexPriceChange(quote.price, change ?? null) : null;
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
            {formatIndexPriceCompact(quote.price, quote.currency)}
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
}: {
  quotes: JournalTickerQuote[];
  loading: boolean;
}) {
  const byId = new Map(quotes.map((quote) => [quote.id, quote]));

  return (
    <span className="inline-flex items-center">
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

export function JournalTickerMarquee() {
  const { quotes, loading } = useJournalTicker();

  return (
    <div
      className="journal-ticker relative overflow-hidden border-y border-border/70 bg-muted/15"
      aria-label="Market prices"
    >
      <div className="journal-ticker-track flex w-max items-center py-3.5">
        <TickerSequence quotes={quotes} loading={loading && quotes.length === 0} />
        <TickerSequence quotes={quotes} loading={loading && quotes.length === 0} />
      </div>
    </div>
  );
}
