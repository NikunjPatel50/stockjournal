"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useJournalMarket } from "@/components/journal/journal-market-provider";
import {
  MarketQuotesContext,
  useMarketQuotesPoller,
} from "@/hooks/use-market-quotes";

const LIVE_MARKET_POLL_ROUTES = ["/journal", "/analytics", "/dashboard"] as const;

export function shouldPollLiveMarketData(pathname: string): boolean {
  return LIVE_MARKET_POLL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/** Single shared quote poll for routes that display live position prices. */
export function MarketQuotesProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pollEnabled = shouldPollLiveMarketData(pathname);
  const { regionTrades, activeCurrency } = useJournalMarket();

  const activeTrades = useMemo(
    () => regionTrades.filter((trade) => (trade.status ?? "Closed") === "Active"),
    [regionTrades]
  );

  const value = useMarketQuotesPoller(
    activeTrades,
    activeCurrency,
    pollEnabled
  );

  const memoized = useMemo(() => value, [value]);

  return (
    <MarketQuotesContext.Provider value={memoized}>
      {children}
    </MarketQuotesContext.Provider>
  );
}
