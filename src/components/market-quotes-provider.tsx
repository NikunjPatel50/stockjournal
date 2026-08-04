"use client";

import { useMemo, type ReactNode } from "react";
import { useSettings } from "@/components/settings/settings-provider";
import {
  MarketQuotesContext,
  useMarketQuotesPoller,
} from "@/hooks/use-market-quotes";
import { useJournalTrades } from "@/lib/trades-storage";

/** Single shared quote poll for all active positions in the authenticated app. */
export function MarketQuotesProvider({ children }: { children: ReactNode }) {
  const { trades } = useJournalTrades();
  const { settings } = useSettings();

  const activeTrades = useMemo(
    () => trades.filter((trade) => (trade.status ?? "Closed") === "Active"),
    [trades]
  );

  const value = useMarketQuotesPoller(
    activeTrades,
    settings.profile.currency
  );

  return (
    <MarketQuotesContext.Provider value={value}>
      {children}
    </MarketQuotesContext.Provider>
  );
}
