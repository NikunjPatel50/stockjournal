"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isJournalTickerSessionOpen,
  JOURNAL_TICKER_INSTRUMENTS,
  type JournalTickerQuote,
} from "@/lib/journal-ticker";

const POLL_OPEN_MS = 15_000;
const POLL_CLOSED_MS = 60_000;

export function useJournalTicker() {
  const [quotes, setQuotes] = useState<JournalTickerQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/journal-ticker", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { quotes?: JournalTickerQuote[] };
      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        setQuotes(data.quotes);
      }
    } catch {
      // Keep the last good strip. The next poll fills any gap.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let timer: number | null = null;
    let cancelled = false;

    const tick = async () => {
      if (!cancelled) await load();
      if (cancelled) return;
      const anyOpen = JOURNAL_TICKER_INSTRUMENTS.some((item) =>
        isJournalTickerSessionOpen(item)
      );
      timer = window.setTimeout(tick, anyOpen ? POLL_OPEN_MS : POLL_CLOSED_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [load]);

  return { quotes, loading };
}
