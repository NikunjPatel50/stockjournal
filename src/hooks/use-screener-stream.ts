"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CLIENT_TTL_MS = 20 * 60 * 1000;
const STORAGE_PREFIX = "sj.screener.v6.";

type CacheEntry<T> = {
  data: T;
  at: number;
};

type StreamEvent<T> =
  | { type: "progress"; loaded: number; total: number }
  | { type: "complete"; data: T }
  | { type: "error"; message: string };

function storageKey(url: string) {
  return url.replace(/([?&])(fresh|stream)=1&?/g, "$1").replace(/[?&]$/, "");
}

function readStored<T>(key: string): CacheEntry<T> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed?.data || Date.now() - parsed.at >= CLIENT_TTL_MS) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeStored<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ data, at: Date.now() })
    );
  } catch {
    // Ignore quota errors.
  }
}

async function streamScreenerPayload<T>(
  url: string,
  onProgress: (percent: number) => void
): Promise<T> {
  const separator = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${separator}fresh=1&stream=1`, {
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
      const event = JSON.parse(line) as StreamEvent<T>;
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

  throw new Error("Refresh ended before data was ready.");
}

export function useScreenerStream<T>(url: string) {
  const key = storageKey(url);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const load = useCallback(
    async (fresh = false) => {
      if (inflight.current) {
        await inflight.current;
        return;
      }

      const task = (async () => {
        if (!fresh) {
          const hit = readStored<T>(key);
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
        setProgress(0);

        try {
          const next = await streamScreenerPayload<T>(url, (percent) => {
            setProgress(percent);
          });
          setData(next);
          writeStored(key, next);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Could not load screener data."
          );
          if (!readStored<T>(key)) setData(null);
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
    },
    [key, url]
  );

  const reload = useCallback(() => load(true), [load]);

  useEffect(() => {
    void load(false);
  }, [load]);

  return { data, error, loading, progress, reload };
}
