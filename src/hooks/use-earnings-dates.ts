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
const CLIENT_FETCH_TIMEOUT_MS = 25_000;

export function useEarningsDates(
  trades: JournalTrade[],
  currency: CurrencyCode = DEFAULT_CURRENCY,
  enabled = true
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
      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        CLIENT_FETCH_TIMEOUT_MS
      );

      const res = await fetch("/api/earnings-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols, currency }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

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
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Earnings lookup timed out"
          : err instanceof Error
            ? err.message
            : "Could not load earnings dates";

      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, [currency, symbols]);

  useEffect(() => {
    if (!enabled) return;
    void fetchEarnings();
  }, [enabled, fetchEarnings, symbolsKey]);

  useEffect(() => {
    if (!enabled || symbols.length === 0) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchEarnings();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [enabled, fetchEarnings, symbols.length, symbolsKey]);

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
