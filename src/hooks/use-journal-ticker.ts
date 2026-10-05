"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isJournalTickerSessionOpen,
  JOURNAL_TICKER_INSTRUMENTS,
  type JournalTickerQuote,
} from "@/lib/journal-ticker";
import {
  decodeYahooPricingData,
  YAHOO_LIVE_STREAM_URL,
} from "@/lib/yahoo-live-quote";

const POLL_FALLBACK_MS = 1_000;
const POLL_CLOSED_MS = 30_000;
const STREAM_SYMBOLS = JOURNAL_TICKER_INSTRUMENTS.map(
  (item) => item.yahooSymbol
);

function mergeQuotes(
  current: JournalTickerQuote[],
  incoming: JournalTickerQuote[],
  skipIds?: Set<string>
): JournalTickerQuote[] {
  const byId = new Map(current.map((quote) => [quote.id, quote]));
  for (const quote of incoming) {
    if (skipIds?.has(quote.id) && byId.has(quote.id)) continue;
    byId.set(quote.id, quote);
  }
  const merged = JOURNAL_TICKER_INSTRUMENTS.flatMap((item) => {
    const quote = byId.get(item.id);
    return quote ? [quote] : [];
  });
  return merged.length > 0 ? merged : current;
}

function quoteFromLive(
  symbol: string,
  price: number,
  change: number | null,
  changePercent: number | null,
  previous?: JournalTickerQuote
): JournalTickerQuote | null {
  const instrument = JOURNAL_TICKER_INSTRUMENTS.find(
    (item) => item.yahooSymbol === symbol
  );
  if (!instrument) return null;
  return {
    id: instrument.id,
    label: instrument.label,
    price,
    change,
    changePercent,
    currency: previous?.currency ?? instrument.currency,
    sessionOpen: isJournalTickerSessionOpen(instrument),
  };
}

export function useJournalTicker() {
  const [quotes, setQuotes] = useState<JournalTickerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const streamedIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2_500);
    try {
      const res = await fetch(`/api/journal-ticker?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { quotes?: JournalTickerQuote[] };
      if (!Array.isArray(data.quotes) || data.quotes.length === 0) return;
      setQuotes((current) =>
        mergeQuotes(current, data.quotes ?? [], streamedIds.current)
      );
    } catch {
      // Keep the last good strip. The stream or the next poll fills any gap.
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let pollTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let keepAliveTimer: number | null = null;
    let cancelled = false;
    let allowReconnect = true;
    let streaming = false;
    let reconnectDelay = 500;
    let generation = 0;

    const pollInterval = () => {
      const anyOpen = JOURNAL_TICKER_INSTRUMENTS.some(
        (item) => item.session !== "crypto" && isJournalTickerSessionOpen(item)
      );
      return anyOpen ? POLL_FALLBACK_MS : POLL_CLOSED_MS;
    };

    const stopPoll = () => {
      if (pollTimer != null) window.clearTimeout(pollTimer);
      pollTimer = null;
    };

    const schedulePoll = () => {
      if (cancelled || streaming) return;
      stopPoll();
      pollTimer = window.setTimeout(() => {
        pollTimer = null;
        if (cancelled || streaming) return;
        void load().finally(schedulePoll);
      }, pollInterval());
    };

    const clearSocketTimers = () => {
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      if (keepAliveTimer != null) window.clearInterval(keepAliveTimer);
      reconnectTimer = null;
      keepAliveTimer = null;
    };

    const connect = () => {
      if (cancelled || !allowReconnect) return;
      if (document.visibilityState !== "visible") return;
      clearSocketTimers();
      const gen = ++generation;

      const ws = new WebSocket(YAHOO_LIVE_STREAM_URL);
      socket = ws;

      ws.onopen = () => {
        if (cancelled || gen !== generation) return;
        reconnectDelay = 500;
        streaming = true;
        stopPoll();
        ws.send(JSON.stringify({ subscribe: STREAM_SYMBOLS }));
        keepAliveTimer = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ subscribe: STREAM_SYMBOLS }));
          }
        }, 20_000);
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        const live = decodeYahooPricingData(event.data);
        if (!live) return;
        setQuotes((current) => {
          const instrument = JOURNAL_TICKER_INSTRUMENTS.find(
            (item) => item.yahooSymbol === live.symbol
          );
          const previous = instrument
            ? current.find((quote) => quote.id === instrument.id)
            : undefined;
          const next = quoteFromLive(
            live.symbol,
            live.price,
            live.change,
            live.changePercent,
            previous
          );
          if (!next) return current;
          streamedIds.current.add(next.id);
          return mergeQuotes(current, [next]);
        });
        setLoading(false);
      };

      ws.onclose = () => {
        if (gen !== generation) return;
        socket = null;
        streaming = false;
        if (keepAliveTimer != null) window.clearInterval(keepAliveTimer);
        keepAliveTimer = null;
        if (cancelled || !allowReconnect) return;
        schedulePoll();
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
      };
    };

    const onVisible = () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") {
        allowReconnect = false;
        streaming = false;
        generation += 1;
        clearSocketTimers();
        stopPoll();
        socket?.close();
        socket = null;
        return;
      }
      allowReconnect = true;
      void load();
      connect();
    };

    void load();
    connect();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      allowReconnect = false;
      generation += 1;
      document.removeEventListener("visibilitychange", onVisible);
      clearSocketTimers();
      stopPoll();
      socket?.close();
      socket = null;
    };
  }, [load]);

  return { quotes, loading };
}
