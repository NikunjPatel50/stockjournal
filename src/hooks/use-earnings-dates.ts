"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import { normalizeQuoteAssetClass } from "@/lib/eodhd";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import {
  earningsLookupKey,
  uniqueEarningsRequests,
  type EarningsDateInfo,
} from "@/lib/yahoo-earnings";

type EarningsState = {
  earnings: Record<string, EarningsDateInfo | null>;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
};

const REFRESH_MS = 6 * 60 * 60 * 1000;

export function useEarningsDates(
  trades: JournalTrade[],
  currency: CurrencyCode = DEFAULT_CURRENCY
) {
  const symbols = useMemo(
    () => uniqueEarningsRequests(trades, defaultListingMarketForCurrency(currency)),
    [trades, currency]
  );
  const symbolsKey = useMemo(
    () =>
      symbols
        .map((s) => earningsLookupKey(s.ticker, s.assetClass))
        .sort()
        .join("|"),
    [symbols]
  );

  const [state, setState] = useState<EarningsState>({
    earnings: {},
    loading: false,
    error: null,
    fetchedAt: null,
  });

  const fetchEarnings = useCallback(async () => {
    if (symbols.length === 0) {
      setState({
        earnings: {},
        loading: false,
        error: null,
        fetchedAt: null,
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: prev.fetchedAt == null,
      error: null,
    }));

    try {
      const res = await fetch("/api/earnings-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols, currency }),
      });

      const data = (await res.json()) as {
        error?: string;
        earnings?: Record<string, EarningsDateInfo | null>;
        fetchedAt?: number;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load earnings dates");
      }

      setState({
        earnings: data.earnings ?? {},
        loading: false,
        error: null,
        fetchedAt: data.fetchedAt ?? Date.now(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Could not load earnings dates",
      }));
    }
  }, [currency, symbols]);

  useEffect(() => {
    void fetchEarnings();
  }, [fetchEarnings, symbolsKey]);

  useEffect(() => {
    if (symbols.length === 0) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchEarnings();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [fetchEarnings, symbols.length, symbolsKey]);

  const getEarningsDate = useCallback(
    (trade: JournalTrade) => {
      const key = earningsLookupKey(
        trade.ticker,
        normalizeQuoteAssetClass(trade.assetClass)
      );
      return state.earnings[key] ?? null;
    },
    [state.earnings]
  );

  return {
    getEarningsDate,
    loading: state.loading,
    error: state.error,
    fetchedAt: state.fetchedAt,
    refresh: fetchEarnings,
  };
}
