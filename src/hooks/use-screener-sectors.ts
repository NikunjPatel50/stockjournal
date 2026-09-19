"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SectorScreenerRow } from "@/lib/screener/types";

const SECTORS_URL = "/api/screener/sectors";
const CLIENT_TTL_MS = 20 * 60 * 1000;
const STORAGE_PREFIX = "sj.screener.v6.";

export type SectorsPayload = {
  sectors: SectorScreenerRow[];
  asOf: string;
  sessionDate?: string;
};

type CacheEntry = {
  data: SectorsPayload;
  at: number;
};

type StreamEvent =
  | { type: "progress"; loaded: number; total: number }
  | { type: "complete"; data: SectorsPayload }
  | { type: "error"; message: string };

function readStored(): CacheEntry | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + SECTORS_URL);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.data || Date.now() - parsed.at >= CLIENT_TTL_MS) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeStored(data: SectorsPayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + SECTORS_URL,
      JSON.stringify({ data, at: Date.now() })
    );
  } catch {
    // Ignore quota errors.
  }
}

async function streamSectorRows(
  onProgress: (percent: number) => void
): Promise<SectorsPayload> {
  const res = await fetch(`${SECTORS_URL}?fresh=1&stream=1`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? "This screener is private."
        : "Could not load screener data."
    );
  }
  if (!res.body) {
    throw new Error("Could not load screener data.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as StreamEvent;
      if (event.type === "progress") {
        const percent = event.total
          ? Math.round((event.loaded / event.total) * 100)
          : 0;
        onProgress(percent);
      } else if (event.type === "complete") {
        onProgress(100);
        return event.data;
      } else if (event.type === "error") {
        throw new Error(event.message || "Could not load screener data.");
      }
    }
  }

  throw new Error("Sector refresh ended before data was ready.");
}

export function useScreenerSectors() {
  const [data, setData] = useState<SectorsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const load = useCallback(async (fresh = false) => {
    if (inflight.current) {
      await inflight.current;
      return;
    }

    const task = (async () => {
      if (!fresh) {
        const hit = readStored();
        if (hit) {
          setData(hit.data);
          setError(null);
          setLoading(false);
          setProgress(100);
          return;
        }
      }

      setLoading(true);
      setError(null);
      setProgress(fresh ? 0 : null);

      try {
        const next = await streamSectorRows((percent) => {
          setProgress(percent);
        });
        setData(next);
        writeStored(next);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load screener data."
        );
        if (!readStored()) setData(null);
      } finally {
        setLoading(false);
        setProgress((current) => (current == null ? null : 100));
      }
    })();

    inflight.current = task;
    try {
      await task;
    } finally {
      if (inflight.current === task) inflight.current = null;
    }
  }, []);

  const reload = useCallback(() => load(true), [load]);

  useEffect(() => {
    void load(false);
  }, [load]);

  return { data, error, loading, progress, reload };
}
