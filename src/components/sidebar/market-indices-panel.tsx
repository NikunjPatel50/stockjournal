"use client";

import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  formatIndexPriceCompact,
  MAJOR_MARKET_INDICES,
  type MarketIndexQuote,
} from "@/lib/major-market-indices";
import { useMarketIndices } from "@/hooks/use-market-indices";
import { useIsCompactApp } from "@/hooks/use-media-query";
import { useSessionClock } from "@/hooks/use-session-clock";
import {
  getMarketSessionCountdown,
  isListingMarketOpen,
  timeZoneForListingMarket,
  type MarketSessionCountdown,
} from "@/lib/listing-market-hours";
import { cn, NUMERIC_DISPLAY_CLASS } from "@/lib/utils";
import { AnimatedNumber, AnimatedPercent } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

const MarketIndicesDetailDialog = dynamic(
  () =>
    import("@/components/sidebar/market-indices-detail-dialog").then((mod) => ({
      default: mod.MarketIndicesDetailDialog,
    })),
  { ssr: false }
);

const REGION_CODES: Record<string, string> = {
  India: "IN",
  USA: "US",
  China: "CN",
  Korea: "KR",
  Japan: "JP",
  UK: "UK",
  Germany: "DE",
  France: "FR",
  "Hong Kong": "HK",
  Australia: "AU",
  Brazil: "BR",
  Singapore: "SG",
};

const OHLC_CARD_WIDTH = 256;
const OHLC_CARD_HEIGHT = 220;

type OhlcAnchor = {
  id: string;
  top: number;
  left: number;
  placement: "right" | "left" | "below";
};

function clampOhlcPosition(
  rect: DOMRect,
  placement: OhlcAnchor["placement"]
): Pick<OhlcAnchor, "top" | "left"> {
  const margin = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let left =
    placement === "left"
      ? rect.left - OHLC_CARD_WIDTH - 10
      : placement === "below"
        ? rect.left
        : rect.right + 10;

  let top = placement === "below" ? rect.bottom + 8 : rect.top;

  if (left + OHLC_CARD_WIDTH > viewportW - margin) {
    left = Math.max(margin, viewportW - OHLC_CARD_WIDTH - margin);
  }
  if (left < margin) left = margin;

  if (top + OHLC_CARD_HEIGHT > viewportH - margin) {
    top = Math.max(margin, viewportH - OHLC_CARD_HEIGHT - margin);
  }
  if (top < margin) top = margin;

  return { top, left };
}

function resolveOhlcPlacement(rect: DOMRect): OhlcAnchor["placement"] {
  const viewportW = window.innerWidth;
  if (rect.right + OHLC_CARD_WIDTH + 16 > viewportW) {
    if (rect.left - OHLC_CARD_WIDTH - 16 > 0) return "left";
    return "below";
  }
  return "right";
}

function ChangeText({ value }: { value: number | null | undefined }) {
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

function MarketStatusDot({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        open ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.45)]" : "bg-muted-foreground/35"
      )}
      aria-hidden
    />
  );
}

function formatMarketDate(listingMarket: ListingMarketId, now: Date): string {
  const timeZone = timeZoneForListingMarket(listingMarket);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);
}

function formatSessionCountdown(
  countdown: Extract<MarketSessionCountdown, { status: "open" | "closed" }>
): string {
  const { hours, minutes, seconds } = countdown;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function OhlcCard({
  label,
  listingMarket,
  ohlc,
  className,
  active = true,
}: {
  label: string;
  listingMarket: ListingMarketId;
  ohlc: NonNullable<MarketIndexQuote["ohlc"]>;
  className?: string;
  active?: boolean;
}) {
  const now = useSessionClock(1000, active);

  const countdown = getMarketSessionCountdown(listingMarket, now);
  const sessionLabel =
    countdown.status === "open"
      ? "Closes in"
      : countdown.status === "closed"
        ? "Opens in"
        : null;

  const items = [
    { label: "Open", value: ohlc.formatted.open },
    { label: "High", value: ohlc.formatted.high },
    { label: "Low", value: ohlc.formatted.low },
    { label: "Close", value: ohlc.formatted.close },
  ] as const;

  return (
    <div
      className={cn(
        "w-full max-w-[16rem] rounded-lg border border-border/80 bg-card px-4 py-3.5 shadow-lg ring-1 ring-border/40 sm:w-64",
        className
      )}
    >
      <p className="mb-1 truncate text-sm font-semibold text-foreground">
        {label}
      </p>
      <p className="mb-3 text-[11px] text-muted-foreground">
        {formatMarketDate(listingMarket, now)}
      </p>
      {sessionLabel && countdown.status !== "unknown" ? (
        <p className="mb-3 flex items-center gap-1.5 text-[11px] tabular-nums">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              countdown.status === "open" ? "bg-emerald-500" : "bg-rose-500"
            )}
            aria-hidden
          />
          <span className="text-muted-foreground">{sessionLabel}</span>
          <span className="font-semibold text-foreground">
            {formatSessionCountdown(countdown)}
          </span>
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketIndicesPanel({
  className,
  scrollable = false,
}: {
  className?: string;
  scrollable?: boolean;
}) {
  const isCompact = useIsCompactApp();
  const pollEnabled = !isCompact;
  const { quotes, loading, error, fetchedAt } = useMarketIndices(pollEnabled);
  const now = useSessionClock(30_000);
  const [ohlcAnchor, setOhlcAnchor] = useState<OhlcAnchor | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dockOffset, setDockOffset] = useState<{ x: number; y: number }>();
  const [mounted, setMounted] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openMarketCount = useMemo(
    () =>
      MAJOR_MARKET_INDICES.filter((index) =>
        isListingMarketOpen(index.listingMarket, now)
      ).length,
    [now]
  );

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const openOhlc = useCallback(
    (id: string, element: HTMLElement) => {
      if (!quotes[id]?.ohlc) return;
      clearHideTimer();

      if (isCompact) {
        setPinnedId((prev) => (prev === id ? null : id));
        setOhlcAnchor(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      const placement = resolveOhlcPlacement(rect);
      const { top, left } = clampOhlcPosition(rect, placement);
      setPinnedId(null);
      setOhlcAnchor({ id, top, left, placement });
    },
    [clearHideTimer, isCompact, quotes]
  );

  const scheduleHide = useCallback(() => {
    if (isCompact) return;
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setOhlcAnchor(null);
    }, 100);
  }, [clearHideTimer, isCompact]);

  const activeIndex = ohlcAnchor
    ? MAJOR_MARKET_INDICES.find((index) => index.id === ohlcAnchor.id)
    : pinnedId
      ? MAJOR_MARKET_INDICES.find((index) => index.id === pinnedId)
      : null;
  const activeQuote =
    activeIndex != null ? quotes[activeIndex.id] : null;

  return (
    <>
      <section className={cn("flex min-h-0 flex-col", className)}>
        <div className="flex items-center gap-2 border-b border-border/70 bg-muted/20 px-2.5 py-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
            Markets
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 rounded-md border border-border/60 bg-background/50 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground",
              NUMERIC_DISPLAY_CLASS
            )}
          >
            {openMarketCount} open
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-background/60 hover:text-foreground"
            aria-label="Expand markets table"
            title="View detailed markets table"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setDockOffset({
                x: rect.left + rect.width / 2 - window.innerWidth / 2,
                y: rect.top + rect.height / 2 - window.innerHeight / 2,
              });
              setDetailOpen(true);
            }}
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </div>

        {error ? (
          <p className="px-2.5 py-2 text-[11px] text-muted-foreground">{error}</p>
        ) : (
          <div className="relative min-h-0 flex flex-col">
            <div
              className={cn(
                "sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 border-b border-border/50 bg-card/80 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 backdrop-blur-sm",
                NUMERIC_DISPLAY_CLASS
              )}
            >
              <span>Index</span>
              <span className="text-right">Last</span>
              <span className="w-[3.25rem] text-right">Chg</span>
            </div>

            <ul
              className={cn(
                "min-h-0 space-y-px px-1.5 py-1",
                scrollable
                  ? "max-h-[min(38vh,15.5rem)] overflow-y-auto overscroll-contain"
                  : "max-lg:max-h-[min(40vh,22rem)] max-lg:overflow-y-auto",

              )}
            >
              {MAJOR_MARKET_INDICES.map((index) => {
                const quote = quotes[index.id];
                const pending = loading && !quote;
                const regionCode = REGION_CODES[index.region] ?? index.region;
                const marketOpen = isListingMarketOpen(index.listingMarket, now);
                const isActive =
                  ohlcAnchor?.id === index.id || pinnedId === index.id;
                const showInlineOhlc =
                  isCompact && pinnedId === index.id && quote?.ohlc;

                return (
                  <li
                    key={index.id}
                    className={cn(
                      "rounded-md px-1.5 py-1.5 transition-colors",
                      isActive
                        ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                        : "even:bg-muted/15 hover:bg-muted/35"
                    )}
                    onMouseEnter={(event) => {
                      if (!isCompact) openOhlc(index.id, event.currentTarget);
                    }}
                    onMouseLeave={scheduleHide}
                    onClick={(event) => {
                      if (isCompact) openOhlc(index.id, event.currentTarget);
                    }}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <MarketStatusDot open={marketOpen} />
                        <span className="min-w-0 truncate text-[11px] leading-none">
                          <span className="font-medium text-foreground">
                            {index.label}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {regionCode}
                          </span>
                        </span>
                      </div>

                      <div className="text-right">
                        {pending ? (
                          <span className="inline-block h-3 w-14 animate-pulse rounded bg-muted" />
                        ) : quote ? (
                          <AnimatedNumber
                            value={quote.price}
                            format={(amount) =>
                              formatIndexPriceCompact(amount, quote.currency)
                            }
                            roll={false}
                            className={cn(
                              "text-[11px] font-semibold tabular-nums",
                              NUMERIC_DISPLAY_CLASS,
                              marketOpen
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          />
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>

                      <div
                        className={cn(
                          "w-[3.25rem] text-right text-[11px]",
                          NUMERIC_DISPLAY_CLASS
                        )}
                      >
                        {pending ? (
                          <span className="inline-block h-3 w-10 animate-pulse rounded bg-muted" />
                        ) : quote ? (
                          <ChangeText value={quote.changePercent} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>

                    {showInlineOhlc ? (
                      <div className="mt-2">
                        <OhlcCard
                          label={`${index.label} · ${index.region}`}
                          listingMarket={index.listingMarket}
                          ohlc={quote.ohlc!}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {scrollable ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card/90 to-transparent"
                aria-hidden
              />
            ) : null}
          </div>
        )}
      </section>

      {mounted &&
        !isCompact &&
        ohlcAnchor &&
        activeIndex &&
        activeQuote?.ohlc &&
        createPortal(
          <div
            className="pointer-events-auto fixed z-[100]"
            style={{ top: ohlcAnchor.top, left: ohlcAnchor.left }}
            onMouseEnter={clearHideTimer}
            onMouseLeave={scheduleHide}
          >
            <OhlcCard
              label={`${activeIndex.label} · ${activeIndex.region}`}
              listingMarket={activeIndex.listingMarket}
              ohlc={activeQuote.ohlc}
            />
          </div>,
          document.body
        )}

      {detailOpen ? (
        <MarketIndicesDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          quotes={quotes}
          loading={loading}
          error={error}
          fetchedAt={fetchedAt}
          dockOffset={dockOffset}
        />
      ) : null}
    </>
  );
}
