"use client";

import { useIsCompactApp } from "@/hooks/use-media-query";
import { useSessionClock } from "@/hooks/use-session-clock";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber, AnimatedPercent } from "@/components/ui/animated-number";
import {
  computeIndexPriceChange,
  formatIndexPrice,
  formatIndexPriceChange,
  MAJOR_MARKET_INDICES,
  type MarketIndexQuote,
} from "@/lib/major-market-indices";
import {
  getMarketSessionCountdown,
  isListingMarketOpen,
  type MarketSessionCountdown,
} from "@/lib/listing-market-hours";
import { cn, NUMERIC_CLASS } from "@/lib/utils";

const headClass =
  "h-10 bg-muted/30 px-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const cellClass = "px-3.5 py-3 text-center text-sm align-middle";
const numericCellClass = cn(cellClass, NUMERIC_CLASS);

function formatSessionCountdown(
  countdown: Extract<MarketSessionCountdown, { status: "open" | "closed" }>
): string {
  const { hours, minutes, seconds } = countdown;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function ChangeCell({ value }: { value: number | null | undefined }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-muted-foreground">—</span>;
  }

  const up = value > 0;
  const down = value < 0;

  return (
    <AnimatedPercent
      value={value}
      decimals={2}
      roll={false}
      className={cn(
        "font-medium",
        up && "text-emerald-700 dark:text-emerald-400",
        down && "text-rose-700 dark:text-rose-400",
        !up && !down && "text-muted-foreground"
      )}
    />
  );
}

function PriceChangeCell({
  price,
  changePercent,
  currency,
}: {
  price: number;
  changePercent: number | null | undefined;
  currency: string;
}) {
  const change = computeIndexPriceChange(price, changePercent ?? null);
  if (change == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  const up = change > 0;
  const down = change < 0;

  return (
    <AnimatedNumber
      value={change}
      format={(latest) => formatIndexPriceChange(latest, currency)}
      roll={false}
      className={cn(
        "font-medium",
        up && "text-emerald-700 dark:text-emerald-400",
        down && "text-rose-700 dark:text-rose-400",
        !up && !down && "text-muted-foreground"
      )}
    />
  );
}

function IndexPrice({
  price,
  currency,
  className,
}: {
  price: number;
  currency: string;
  className?: string;
}) {
  return (
    <AnimatedNumber
      value={price}
      format={(amount) => formatIndexPrice(amount, currency)}
      roll={false}
      className={className}
    />
  );
}

function OhlcValue({
  value,
  currency,
}: {
  value: number;
  currency: string;
}) {
  return (
    <AnimatedNumber
      value={value}
      format={(amount) => formatIndexPrice(amount, currency)}
      roll={false}
      className="truncate font-medium"
    />
  );
}

function formatFetchedAt(fetchedAt: number | null): string {
  if (fetchedAt == null) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(fetchedAt));
}

type MarketIndicesDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotes: Record<string, MarketIndexQuote | null>;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  dockOffset?: { x: number; y: number };
};

export function MarketIndicesDetailDialog({
  open,
  onOpenChange,
  quotes,
  loading,
  error,
  fetchedAt,
  dockOffset,
}: MarketIndicesDetailDialogProps) {
  const isCompact = useIsCompactApp();
  const now = useSessionClock(1000, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        motion="dock"
        dockOffset={dockOffset}
        className="flex max-h-[min(92vh,860px)] w-[calc(100%-2rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 pr-14">
          <DialogTitle className="text-lg">Major markets</DialogTitle>
          <DialogDescription>
            Live benchmark indices across major equity markets. Updated{" "}
            {formatFetchedAt(fetchedAt)}
            {loading ? " · refreshing…" : null}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {error ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">{error}</p>
          ) : isCompact ? (
            <ul className="divide-y divide-border/60">
              {MAJOR_MARKET_INDICES.map((index) => {
                const quote = quotes[index.id];
                const pending = loading && !quote;
                const marketOpen = isListingMarketOpen(
                  index.listingMarket,
                  now
                );
                const countdown = getMarketSessionCountdown(
                  index.listingMarket,
                  now
                );
                const sessionText =
                  countdown.status === "open"
                    ? `Closes in ${formatSessionCountdown(countdown)}`
                    : countdown.status === "closed"
                      ? `Opens in ${formatSessionCountdown(countdown)}`
                      : "—";

                return (
                  <li key={index.id} className="space-y-2.5 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          {index.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {index.region} · {index.yahooSymbol}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 gap-1.5 px-2 py-0.5 text-[10px] font-medium",
                          marketOpen
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        )}
                      >
                        {marketOpen ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {sessionText}
                    </p>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-base font-semibold tabular-nums">
                        {pending ? (
                          <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
                        ) : quote ? (
                          <IndexPrice
                            price={quote.price}
                            currency={quote.currency}
                          />
                        ) : (
                          "—"
                        )}
                      </span>
                      {!pending && quote ? (
                        <>
                          <PriceChangeCell
                            price={quote.price}
                            changePercent={quote.changePercent}
                            currency={quote.currency}
                          />
                          <ChangeCell value={quote.changePercent} />
                        </>
                      ) : null}
                    </div>
                    {quote?.ohlc ? (
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2.5 text-xs">
                        {(
                          [
                            ["Open", quote.ohlc.open],
                            ["High", quote.ohlc.high],
                            ["Low", quote.ohlc.low],
                            ["Close", quote.ohlc.close],
                          ] as const
                        ).map(([label, value]) => (
                          <div key={label} className="min-w-0 text-center">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-0.5 truncate tabular-nums">
                              <OhlcValue
                                value={value}
                                currency={quote.currency}
                              />
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className={headClass}>Index</TableHead>
                  <TableHead className={headClass}>Region</TableHead>
                  <TableHead className={headClass}>Status</TableHead>
                  <TableHead className={headClass}>Session</TableHead>
                  <TableHead className={headClass}>Price</TableHead>
                  <TableHead className={headClass}>Price change</TableHead>
                  <TableHead className={headClass}>Change</TableHead>
                  <TableHead className={headClass}>Open</TableHead>
                  <TableHead className={headClass}>High</TableHead>
                  <TableHead className={headClass}>Low</TableHead>
                  <TableHead className={headClass}>Close</TableHead>
                  <TableHead className={headClass}>Symbol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MAJOR_MARKET_INDICES.map((index) => {
                  const quote = quotes[index.id];
                  const pending = loading && !quote;
                  const marketOpen = isListingMarketOpen(
                    index.listingMarket,
                    now
                  );
                  const countdown = getMarketSessionCountdown(
                    index.listingMarket,
                    now
                  );
                  const sessionText =
                    countdown.status === "open"
                      ? `Closes in ${formatSessionCountdown(countdown)}`
                      : countdown.status === "closed"
                        ? `Opens in ${formatSessionCountdown(countdown)}`
                        : "—";

                  return (
                    <TableRow key={index.id} className="border-border/60">
                      <TableCell className={cn(cellClass, "font-medium")}>
                        {index.label}
                      </TableCell>
                      <TableCell className={cellClass}>{index.region}</TableCell>
                      <TableCell className={cellClass}>
                        <Badge
                          variant="outline"
                          className={cn(
                            "mx-auto gap-1.5 px-2 py-0.5 text-[10px] font-medium",
                            marketOpen
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              marketOpen ? "bg-emerald-500" : "bg-rose-500"
                            )}
                            aria-hidden
                          />
                          {marketOpen ? "Open" : "Closed"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(cellClass, "tabular-nums text-muted-foreground")}
                      >
                        {sessionText}
                      </TableCell>
                      <TableCell className={cn(numericCellClass, "font-semibold")}>
                        {pending ? (
                          <span className="mx-auto block h-4 w-20 animate-pulse rounded bg-muted" />
                        ) : quote ? (
                          <IndexPrice
                            price={quote.price}
                            currency={quote.currency}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className={numericCellClass}>
                        {pending ? (
                          <span className="mx-auto block h-4 w-16 animate-pulse rounded bg-muted" />
                        ) : quote ? (
                          <PriceChangeCell
                            price={quote.price}
                            changePercent={quote.changePercent}
                            currency={quote.currency}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className={numericCellClass}>
                        {pending ? (
                          <span className="mx-auto block h-4 w-12 animate-pulse rounded bg-muted" />
                        ) : (
                          <ChangeCell value={quote?.changePercent} />
                        )}
                      </TableCell>
                      <TableCell className={numericCellClass}>
                        {quote?.ohlc ? (
                          <OhlcValue
                            value={quote.ohlc.open}
                            currency={quote.currency}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className={numericCellClass}>
                        {quote?.ohlc ? (
                          <OhlcValue
                            value={quote.ohlc.high}
                            currency={quote.currency}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className={numericCellClass}>
                        {quote?.ohlc ? (
                          <OhlcValue
                            value={quote.ohlc.low}
                            currency={quote.currency}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className={numericCellClass}>
                        {quote?.ohlc ? (
                          <OhlcValue
                            value={quote.ohlc.close}
                            currency={quote.currency}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(cellClass, "font-mono text-xs text-muted-foreground")}
                      >
                        {index.yahooSymbol}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
