"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultListingMarketForCurrency } from "@/lib/equity-listing-markets";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import { normalizeQuoteAssetClass } from "@/lib/eodhd";
import {
  getMarketSessionCountdown,
  type MarketSessionCountdown,
} from "@/lib/listing-market-hours";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";

function primaryListingMarketFromActiveTrades(
  trades: JournalTrade[],
  currency: CurrencyCode
): ListingMarketId | null {
  const activeEquity = trades.filter(
    (trade) =>
      (trade.status ?? "Closed") === "Active" &&
      normalizeQuoteAssetClass(trade.assetClass) === "Equities"
  );

  if (activeEquity.length === 0) return null;

  const counts = new Map<ListingMarketId, number>();
  for (const trade of activeEquity) {
    const market =
      trade.listingMarket ?? defaultListingMarketForCurrency(currency);
    counts.set(market, (counts.get(market) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function formatCountdown(countdown: Extract<
  MarketSessionCountdown,
  { status: "open" | "closed" }
>): string {
  const { hours, minutes, seconds } = countdown;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

interface MarketSessionTimerProps {
  trades: JournalTrade[];
  currency: CurrencyCode;
}

export function MarketSessionTimer({
  trades,
  currency,
}: MarketSessionTimerProps) {
  const listingMarket = useMemo(
    () => primaryListingMarketFromActiveTrades(trades, currency),
    [trades, currency]
  );

  const [countdown, setCountdown] = useState<MarketSessionCountdown>(() =>
    listingMarket
      ? getMarketSessionCountdown(listingMarket)
      : { status: "unknown" }
  );

  useEffect(() => {
    if (!listingMarket) return;

    const tick = () => {
      setCountdown(getMarketSessionCountdown(listingMarket));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [listingMarket]);

  if (!listingMarket || countdown.status === "unknown") return null;

  const isOpen = countdown.status === "open";
  const label = isOpen
    ? `Closes in ${formatCountdown(countdown)}`
    : `Opens in ${formatCountdown(countdown)}`;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums"
      title={isOpen ? "Regular session close countdown" : "Next session open countdown"}
    >
      <span
        className={`size-1.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-slate-400"}`}
        aria-hidden
      />
      {label}
    </span>
  );
}
