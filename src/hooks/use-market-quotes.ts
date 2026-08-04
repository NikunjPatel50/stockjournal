"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  isSymbolQuoteSessionOpen,
  quotePollIntervalMs,
} from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";

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
  sessionOpen: boolean;
};

export type MarketQuotesValue = {
  getQuote: (trade: JournalTrade) => ClientMarketQuote | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  delayed: boolean;
  sessionOpen: boolean;
  refresh: () => Promise<void>;
};

type SymbolRequest = {
  ticker: string;
  assetClass: JournalTrade["assetClass"];
  entryPrice: number;
  listingMarket: ListingMarketId;
};

function uniqueSymbolRequests(trades: JournalTrade[], currency: CurrencyCode) {
  const seen = new Set<string>();
  const out: SymbolRequest[] = [];
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

function anySymbolSessionOpen(symbols: SymbolRequest[], now = new Date()) {
  return symbols.some((symbol) =>
    isSymbolQuoteSessionOpen(symbol.assetClass, symbol.listingMarket, now)
  );
}

export const MarketQuotesContext = createContext<MarketQuotesValue | null>(
  null
);

export function useMarketQuotesPoller(
  trades: JournalTrade[],
  currency: CurrencyCode = DEFAULT_CURRENCY
): MarketQuotesValue {
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
    sessionOpen: false,
  });

  const pollGenerationRef = useRef(0);
  const pollTimerRef = useRef<number | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0) {
      setState((prev) => ({
        ...prev,
        quotes: {},
        loading: false,
        error: null,
        fetchedAt: null,
        sessionOpen: false,
      }));
      return;
    }

    const now = new Date();
    const sessionOpen = anySymbolSessionOpen(symbols, now);
    const generation = ++pollGenerationRef.current;

    setState((prev) => {
      const requestedKeys = symbols.map((s) =>
        quoteLookupKey(s.ticker, normalizeQuoteAssetClass(s.assetClass))
      );
      const hasMissing = requestedKeys.some((k) => prev.quotes[k] == null);
      return {
        ...prev,
        loading: hasMissing,
        error: null,
        sessionOpen,
      };
    });

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

      const fetchedAt = data.fetchedAt ?? Date.now();

      setState((prev) => ({
        quotes: { ...prev.quotes, ...(data.quotes ?? {}) },
        loading: false,
        error: null,
        fetchedAt,
        delayed: data.delayed !== false,
        sessionOpen: anySymbolSessionOpen(symbols, new Date(fetchedAt)),
      }));
    } catch (err) {
      if (generation !== pollGenerationRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Could not load quotes",
        sessionOpen: anySymbolSessionOpen(symbols),
      }));
    }
  }, [currency, symbols]);

  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
    }

    const delay = quotePollIntervalMs(symbols);
    pollTimerRef.current = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        void fetchQuotes();
      }
      schedulePoll();
    }, delay);
  }, [fetchQuotes, symbols]);

  useEffect(() => {
    pollGenerationRef.current += 1;
    void fetchQuotes();
    schedulePoll();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchQuotes();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (pollTimerRef.current != null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [fetchQuotes, schedulePoll, symbolsKey]);

  const getQuote = useCallback(
    (trade: JournalTrade) => {
      const assetClass = normalizeQuoteAssetClass(trade.assetClass);
      const key = quoteLookupKey(trade.ticker, assetClass);
      const quote = state.quotes[key] ?? null;
      if (!quote) return null;

      const listingMarket =
        trade.listingMarket != null
          ? normalizeListingMarket(trade.listingMarket)
          : defaultListingMarketForCurrency(currency);
      const sessionOpen = isSymbolQuoteSessionOpen(
        assetClass,
        listingMarket
      );

      if (sessionOpen) return quote;

      return {
        ...quote,
        isLive: false,
      };
    },
    [currency, state.quotes]
  );

  return {
    getQuote,
    loading: state.loading,
    error: state.error,
    fetchedAt: state.fetchedAt,
    delayed: state.delayed,
    sessionOpen: state.sessionOpen,
    refresh: fetchQuotes,
  };
}

/** Read shared quotes from the app-wide MarketQuotesProvider. */
export function useMarketQuotes(): MarketQuotesValue {
  const context = useContext(MarketQuotesContext);
  if (!context) {
    throw new Error(
      "useMarketQuotes must be used within MarketQuotesProvider"
    );
  }
  return context;
}
