"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isScrollActive, onScrollEnd } from "@/lib/scroll-activity";
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
  msUntilNextSessionBoundaryForSymbols,
  quotePollIntervalMs,
} from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { readQuotesCache, writeQuotesCache } from "@/lib/quotes-cache";

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
  /** Bumps when any watched quote price or change % updates. */
  quoteRevision: number;
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

function quotesPayloadChanged(
  prev: Record<string, ClientMarketQuote | null>,
  incoming: Record<string, ClientMarketQuote | null>
): boolean {
  const keys = new Set([...Object.keys(prev), ...Object.keys(incoming)]);
  for (const key of keys) {
    const a = prev[key];
    const b = incoming[key];
    if (
      a?.price !== b?.price ||
      a?.changePercent !== b?.changePercent ||
      a?.isLive !== b?.isLive ||
      a?.timestamp !== b?.timestamp
    ) {
      return true;
    }
  }
  return false;
}

function clearPollTimers(
  pollTimerRef: { current: number | null },
  boundaryTimerRef: { current: number | null }
) {
  if (pollTimerRef.current != null) {
    window.clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
  }
  if (boundaryTimerRef.current != null) {
    window.clearTimeout(boundaryTimerRef.current);
    boundaryTimerRef.current = null;
  }
}

export const MarketQuotesContext = createContext<MarketQuotesValue | null>(
  null
);

export function useMarketQuotesPoller(
  trades: JournalTrade[],
  currency: CurrencyCode = DEFAULT_CURRENCY,
  enabled = true
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

  // Source of truth for getQuote: updated in the same tick we accept quotes so
  // a reader never sees a value older than the revision it re-rendered for.
  const quotesRef = useRef(state.quotes);

  const pollGenerationRef = useRef(0);
  const pollTimerRef = useRef<number | null>(null);
  const boundaryTimerRef = useRef<number | null>(null);
  const sessionOpenRef = useRef(false);
  const schedulePollRef = useRef<(() => void) | null>(null);
  const quoteRevisionRef = useRef(0);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const pendingQuotePatchRef = useRef<{
    quotes: Record<string, ClientMarketQuote | null>;
    fetchedAt: number;
    delayed: boolean;
    sessionOpen: boolean;
  } | null>(null);

  const flushPendingQuotes = useCallback(() => {
    const pending = pendingQuotePatchRef.current;
    if (!pending) return;
    pendingQuotePatchRef.current = null;
    const merged = { ...quotesRef.current, ...pending.quotes };
    quotesRef.current = merged;
    setState((prev) => ({
      ...prev,
      quotes: merged,
      loading: false,
      error: null,
      fetchedAt: pending.fetchedAt,
      delayed: pending.delayed,
      sessionOpen: pending.sessionOpen,
    }));
    quoteRevisionRef.current += 1;
    setQuoteRevision(quoteRevisionRef.current);
  }, []);

  useEffect(() => onScrollEnd(flushPendingQuotes), [flushPendingQuotes]);

  useLayoutEffect(() => {
    if (symbols.length === 0) return;

    const keys = symbols.map((s) => quoteLookupKey(s.ticker, s.assetClass));
    const cached = readQuotesCache(keys);
    if (Object.keys(cached).length === 0) return;

    const merged = { ...cached, ...quotesRef.current };
    if (!quotesPayloadChanged(quotesRef.current, merged)) return;

    const hasMissing = keys.some((key) => merged[key] == null);
    quotesRef.current = merged;
    setState((prev) => ({
      ...prev,
      quotes: merged,
      loading: hasMissing,
    }));

    // Consumers memoize on quoteRevision, so seeding from cache has to bump it
    // too — otherwise a reload that needs no refetch never recomputes.
    quoteRevisionRef.current += 1;
    setQuoteRevision(quoteRevisionRef.current);
  }, [symbols, symbolsKey]);

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0) {
      pendingQuotePatchRef.current = null;
      quotesRef.current = {};
      setState((prev) => ({
        ...prev,
        quotes: {},
        loading: false,
        error: null,
        fetchedAt: null,
        sessionOpen: false,
      }));
      quoteRevisionRef.current += 1;
      setQuoteRevision(quoteRevisionRef.current);
      return;
    }

    const now = new Date();
    const sessionOpen = anySymbolSessionOpen(symbols, now);
    const generation = ++pollGenerationRef.current;

    const hasMissing = symbols.some(
      (s) =>
        quotesRef.current[
          quoteLookupKey(s.ticker, normalizeQuoteAssetClass(s.assetClass))
        ] == null
    );
    setState((prev) => ({
      ...prev,
      loading: hasMissing,
      error: null,
      sessionOpen,
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

      const fetchedAt = data.fetchedAt ?? Date.now();
      const incoming = data.quotes ?? {};
      const sessionOpenAtFetch = anySymbolSessionOpen(
        symbols,
        new Date(fetchedAt)
      );

      writeQuotesCache(incoming);

      // React may run the updater long after setState returns, so the decision
      // to bump quoteRevision has to be made here against the ref, not inside
      // it — otherwise consumers memoized on the revision never recompute.
      const quotesChanged = quotesPayloadChanged(quotesRef.current, incoming);
      const defer =
        isScrollActive() && document.visibilityState === "visible";

      if (!quotesChanged) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          delayed: data.delayed !== false,
          sessionOpen: sessionOpenAtFetch,
        }));
      } else if (defer) {
        pendingQuotePatchRef.current = {
          quotes: {
            ...(pendingQuotePatchRef.current?.quotes ?? {}),
            ...incoming,
          },
          fetchedAt,
          delayed: data.delayed !== false,
          sessionOpen: sessionOpenAtFetch,
        };
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          sessionOpen: sessionOpenAtFetch,
        }));
      } else {
        const merged = { ...quotesRef.current, ...incoming };
        quotesRef.current = merged;
        setState(() => ({
          quotes: merged,
          loading: false,
          error: null,
          fetchedAt,
          delayed: data.delayed !== false,
          sessionOpen: sessionOpenAtFetch,
        }));
        quoteRevisionRef.current += 1;
        setQuoteRevision(quoteRevisionRef.current);
      }

      const nowOpen = sessionOpenAtFetch;
      if (nowOpen !== sessionOpenRef.current) {
        sessionOpenRef.current = nowOpen;
        schedulePollRef.current?.();
      }
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
    clearPollTimers(pollTimerRef, boundaryTimerRef);

    if (!enabled) {
      return;
    }

    const now = new Date();
    const delay = quotePollIntervalMs(symbols, now);
    pollTimerRef.current = window.setTimeout(() => {
      void fetchQuotes();
      schedulePollRef.current?.();
    }, delay);

    const boundaryMs = msUntilNextSessionBoundaryForSymbols(symbols, now);
    if (boundaryMs != null && boundaryMs > 0) {
      boundaryTimerRef.current = window.setTimeout(() => {
        setState((prev) => ({ ...prev, loading: true }));
        void fetchQuotes();
        schedulePollRef.current?.();
      }, boundaryMs + 100);
    }
  }, [enabled, fetchQuotes, symbols]);

  schedulePollRef.current = schedulePoll;

  useEffect(() => {
    if (!enabled) {
      pollGenerationRef.current += 1;
      clearPollTimers(pollTimerRef, boundaryTimerRef);
      return;
    }

    pollGenerationRef.current += 1;
    void fetchQuotes();
    schedulePoll();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        flushPendingQuotes();
        void fetchQuotes();
        schedulePollRef.current?.();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearPollTimers(pollTimerRef, boundaryTimerRef);
    };
  }, [enabled, fetchQuotes, flushPendingQuotes, schedulePoll, symbolsKey]);

  const getQuote = useCallback(
    (trade: JournalTrade) => {
      const assetClass = normalizeQuoteAssetClass(trade.assetClass);
      const key = quoteLookupKey(trade.ticker, assetClass);
      const quote = quotesRef.current[key] ?? null;
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
    [currency]
  );

  return useMemo(
    () => ({
      getQuote,
      loading: enabled ? state.loading : false,
      error: enabled ? state.error : null,
      fetchedAt: state.fetchedAt,
      quoteRevision,
      delayed: state.delayed,
      sessionOpen: enabled ? state.sessionOpen : false,
      refresh: fetchQuotes,
    }),
    [
      enabled,
      fetchQuotes,
      getQuote,
      quoteRevision,
      state.delayed,
      state.error,
      state.fetchedAt,
      state.loading,
      state.sessionOpen,
    ]
  );
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
