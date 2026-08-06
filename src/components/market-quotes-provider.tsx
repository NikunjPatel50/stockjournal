"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/components/settings/settings-provider";
import {
  MarketQuotesContext,
  useMarketQuotesPoller,
} from "@/hooks/use-market-quotes";
import { useJournalTrades } from "@/components/journal-trades-provider";

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
  const { trades } = useJournalTrades();
  const { settings } = useSettings();

  const activeTrades = useMemo(
    () => trades.filter((trade) => (trade.status ?? "Closed") === "Active"),
    [trades]
  );

  const value = useMarketQuotesPoller(
    activeTrades,
    settings.profile.currency,
    pollEnabled
  );

  const memoized = useMemo(() => value, [value]);

  return (
    <MarketQuotesContext.Provider value={memoized}>
      {children}
    </MarketQuotesContext.Provider>
  );
}
