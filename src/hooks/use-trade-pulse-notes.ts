"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import type { TradePulseNoteDto } from "@/app/api/trade-pulse/route";

type TradePulseState = {
  notes: TradePulseNoteDto[];
  loading: boolean;
  generating: boolean;
  error: string | null;
  setupRequired: boolean;
};

function todayRunKey() {
  return `trade_pulse_auto_run_${format(new Date(), "yyyy-MM-dd")}`;
}

export function useTradePulseNotes(options: { autoGenerate?: boolean } = {}) {
  const autoGenerate = options.autoGenerate ?? false;
  const [state, setState] = useState<TradePulseState>({
    notes: [],
    loading: true,
    generating: false,
    error: null,
    setupRequired: false,
  });
  const autoRunStarted = useRef(false);

  const fetchNotes = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: prev.notes.length === 0,
      error: null,
    }));

    try {
      const res = await fetch("/api/trade-pulse", { cache: "no-store" });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        notes?: TradePulseNoteDto[];
      };

      if (!res.ok) {
        setState({
          notes: data.notes ?? [],
          loading: false,
          generating: false,
          error: data.error ?? "Could not load Trade Pulse notes",
          setupRequired: data.code === "missing_table",
        });
        return;
      }

      setState((prev) => ({
        notes: data.notes ?? [],
        loading: false,
        generating: false,
        error: null,
        setupRequired: false,
      }));
    } catch (error) {
      setState({
        notes: [],
        loading: false,
        generating: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load Trade Pulse notes",
        setupRequired: false,
      });
    }
  }, []);

  const generateNotes = useCallback(async () => {
    setState((prev) => ({ ...prev, generating: true, error: null }));

    try {
      const res = await fetch("/api/trade-pulse/run", {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not generate Trade Pulse notes");
      }

      await fetchNotes();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        generating: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not generate Trade Pulse notes",
      }));
    }
  }, [fetchNotes]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (!autoGenerate || autoRunStarted.current || state.loading) return;

    autoRunStarted.current = true;
    const alreadyRan =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(todayRunKey()) === "1";

    if (alreadyRan) return;

    void (async () => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(todayRunKey(), "1");
      }
      await generateNotes();
    })();
  }, [autoGenerate, generateNotes, state.loading]);

  return {
    ...state,
    refresh: fetchNotes,
    generateNotes,
  };
}
