"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import {
  defaultEquityExchangeForCurrency,
  normalizeQuoteAssetClass,
  quoteLookupKey,
} from "@/lib/eodhd";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";

export type ClientMarketQuote = {
  price: number | null;
  changePercent: number | null;
  timestamp: number | null;
  currency?: CurrencyCode;
  /** True when price is streaming or refreshed from a live feed (not static EOD only). */
  isLive?: boolean;
};

type QuotesState = {
  quotes: Record<string, ClientMarketQuote | null>;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  delayed: boolean;
};

const REFRESH_MS = 3_000;

function uniqueSymbolRequests(trades: JournalTrade[], currency: CurrencyCode) {
  const seen = new Set<string>();
  const out: {
    ticker: string;
    assetClass: JournalTrade["assetClass"];
    entryPrice: number;
    listingMarket: ListingMarketId;
  }[] = [];
  for (const trade of trades) {
    const assetClass = normalizeQuoteAssetClass(trade.assetClass);
    const key = quoteLookupKey(trade.ticker, assetClass);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ticker: trade.ticker,
      assetClass,
      entryPrice: trade.entryPrice,
      listingMarket:
        trade.listingMarket != null
          ? normalizeListingMarket(trade.listingMarket)
          : defaultListingMarketForCurrency(currency),
    });
  }
  return out;
}

export function useMarketQuotes(
  trades: JournalTrade[],
  currency: CurrencyCode = "USD"
) {
  const symbols = useMemo(
    () => uniqueSymbolRequests(trades, currency),
    [trades, currency]
  );
  const symbolsKey = useMemo(
    () =>
      symbols
        .map((s) => quoteLookupKey(s.ticker, s.assetClass))
        .sort()
        .join("|"),
    [symbols]
  );

  const [state, setState] = useState<QuotesState>({
    quotes: {},
    loading: false,
    error: null,
    fetchedAt: null,
    delayed: true,
  });

  const pollGenerationRef = useRef(0);

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0) {
      setState((prev) => ({
        ...prev,
        quotes: {},
        loading: false,
        error: null,
        fetchedAt: null,
      }));
      return;
    }

    const generation = ++pollGenerationRef.current;

    setState((prev) => ({
      ...prev,
      loading: prev.fetchedAt === null && Object.keys(prev.quotes).length === 0,
      error: null,
    }));

    try {
      const res = await fetch("/api/market-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols,
          currency,
          equityExchange: defaultEquityExchangeForCurrency(currency),
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        quotes?: Record<string, ClientMarketQuote | null>;
        fetchedAt?: number;
        delayed?: boolean;
      };

      if (generation !== pollGenerationRef.current) return;

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load quotes");
      }

      setState({
        quotes: data.quotes ?? {},
        loading: false,
        error: null,
        fetchedAt: data.fetchedAt ?? Date.now(),
        delayed: data.delayed !== false,
      });
    } catch (err) {
      if (generation !== pollGenerationRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Could not load quotes",
      }));
    }
  }, [currency, symbols]);

  useEffect(() => {
    pollGenerationRef.current += 1;
    void fetchQuotes();
  }, [fetchQuotes, symbolsKey]);

  useEffect(() => {
    if (symbols.length === 0) return;

    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchQuotes();
    };

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchQuotes();
    }, REFRESH_MS);

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchQuotes, symbols.length, symbolsKey]);

  const getQuote = useCallback(
    (trade: JournalTrade) => {
      const key = quoteLookupKey(
        trade.ticker,
        normalizeQuoteAssetClass(trade.assetClass)
      );
      return state.quotes[key] ?? null;
    },
    [state.quotes]
  );

  return {
    getQuote,
    loading: state.loading,
    error: state.error,
    fetchedAt: state.fetchedAt,
    delayed: state.delayed,
    refresh: fetchQuotes,
  };
}
