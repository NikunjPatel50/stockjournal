"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MarketIndexQuote } from "@/lib/major-market-indices";
import {
  anyMajorIndexMarketOpen,
  majorMarketIndicesPollIntervalMs,
  MAJOR_MARKET_INDICES,
} from "@/lib/major-market-indices";
import { msUntilNextSessionBoundaryForSymbols } from "@/lib/listing-market-hours";

type MarketIndicesState = {
  quotes: Record<string, MarketIndexQuote | null>;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
};

function indexBoundaryMs(now = new Date()) {
  return msUntilNextSessionBoundaryForSymbols(
    MAJOR_MARKET_INDICES.map((index) => ({
      assetClass: "Equities" as const,
      listingMarket: index.listingMarket,
    })),
    now
  );
}

function clearTimers(
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

export function useMarketIndices(enabled = true) {
  const [state, setState] = useState<MarketIndicesState>({
    quotes: {},
    loading: true,
    error: null,
    fetchedAt: null,
  });

  const pollTimerRef = useRef<number | null>(null);
  const boundaryTimerRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const sessionOpenRef = useRef(false);
  const schedulePollRef = useRef<(() => void) | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const fetchIndices = useCallback(async () => {
    const generation = ++generationRef.current;

    try {
      const res = await fetch("/api/market-indices", { cache: "no-store" });
      const data = (await res.json()) as {
        error?: string;
        indices?: Record<string, MarketIndexQuote | null>;
        fetchedAt?: number;
      };

      if (generation !== generationRef.current) return;

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load market indices");
      }

      const nowOpen = anyMajorIndexMarketOpen();
      setState((prev) => ({
        quotes: { ...prev.quotes, ...(data.indices ?? {}) },
        loading: false,
        error: null,
        fetchedAt: data.fetchedAt ?? Date.now(),
      }));

      if (nowOpen !== sessionOpenRef.current) {
        sessionOpenRef.current = nowOpen;
        schedulePollRef.current?.();
      }
    } catch (err) {
      if (generation !== generationRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          err instanceof Error ? err.message : "Could not load market indices",
      }));
    }
  }, []);

  const schedulePoll = useCallback(() => {
    clearTimers(pollTimerRef, boundaryTimerRef);

    if (!enabledRef.current) {
      return;
    }

    const now = new Date();
    const delay = majorMarketIndicesPollIntervalMs(now);
    pollTimerRef.current = window.setTimeout(() => {
      if (!enabledRef.current) return;
      void fetchIndices();
      schedulePollRef.current?.();
    }, delay);

    const nextBoundary = indexBoundaryMs(now);
    if (nextBoundary != null && nextBoundary > 0) {
      boundaryTimerRef.current = window.setTimeout(() => {
        if (!enabledRef.current) return;
        void fetchIndices();
        schedulePollRef.current?.();
      }, nextBoundary + 100);
    }
  }, [fetchIndices]);

  schedulePollRef.current = schedulePoll;

  useEffect(() => {
    generationRef.current += 1;
    sessionOpenRef.current = anyMajorIndexMarketOpen();

    void fetchIndices();

    if (!enabled) {
      clearTimers(pollTimerRef, boundaryTimerRef);
      return;
    }

    schedulePoll();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && enabledRef.current) {
        void fetchIndices();
        schedulePollRef.current?.();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimers(pollTimerRef, boundaryTimerRef);
    };
  }, [enabled, fetchIndices, schedulePoll]);

  return state;
}
