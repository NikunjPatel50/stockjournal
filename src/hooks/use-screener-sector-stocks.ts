"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SectorScreenerRow, SectorStockRow } from "@/lib/screener/types";

type SectorStocksPayload = {
  sector: SectorScreenerRow;
  stocks: SectorStockRow[];
  asOf: string;
  sessionDate?: string;
};

const CLIENT_TTL_MS = 20 * 60 * 1000;
const STORAGE_PREFIX = "sj.screener.v8.";

type CacheEntry<T> = {
  data: T;
  at: number;
};

type StreamEvent =
  | { type: "meta"; data: SectorStocksPayload }
  | { type: "stock"; stock: SectorStockRow; loaded: number; total: number }
  | { type: "complete"; data: SectorStocksPayload }
  | { type: "error"; message: string };

function storageKey(url: string) {
  return url.replace(/([?&])(fresh|stream)=1&?/g, "$1").replace(/[?&]$/, "");
}

function readStored(key: string): SectorStocksPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<SectorStocksPayload>;
    if (!parsed?.data || Date.now() - parsed.at >= CLIENT_TTL_MS) return null;
    if (!parsed.data.stocks?.length) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeStored(key: string, data: SectorStocksPayload) {
  if (typeof window === "undefined" || data.stocks.length === 0) return;
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ data, at: Date.now() })
    );
  } catch {
    // Ignore quota errors.
  }
}

export function useScreenerSectorStocks(url: string) {
  const key = storageKey(url);
  const [data, setData] = useState<SectorStocksPayload | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);
  const draftRef = useRef<SectorStocksPayload | null>(null);

  const load = useCallback(
    async (fresh = false) => {
      const requestId = ++requestRef.current;

      if (!fresh) {
        const hit = readStored(key);
        if (hit) {
          setData(hit);
          setLoaded(hit.stocks.length);
          setTotal(hit.stocks.length);
          setError(null);
          setLoading(false);
          return;
        }
      }

      setData(null);
      draftRef.current = null;
      setLoading(true);
      setError(null);
      setLoaded(0);
      setTotal(0);

      const separator = url.includes("?") ? "&" : "?";
      const nextUrl = fresh
        ? `${url}${separator}fresh=1&stream=1`
        : `${url}${separator}stream=1`;

      try {
        const res = await fetch(nextUrl, {
          cache: fresh ? "no-store" : "default",
        });
        if (requestId !== requestRef.current) return;
        if (!res.ok) {
          throw new Error(
            res.status === 403
              ? "This screener is private."
              : "Could not load screener data."
          );
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("ndjson")) {
          const payload = (await res.json()) as SectorStocksPayload;
          if (requestId !== requestRef.current) return;
          setData(payload);
          setLoaded(payload.stocks.length);
          setTotal(payload.stocks.length);
          writeStored(key, payload);
          return;
        }

        if (!res.body) throw new Error("Could not load screener data.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const pending = new Map<string, SectorStockRow>();
        let frame = 0;

        const flush = () => {
          frame = 0;
          const current = draftRef.current;
          if (
            !current ||
            pending.size === 0 ||
            requestId !== requestRef.current
          ) {
            return;
          }
          const next = {
            ...current,
            stocks: current.stocks.map(
              (row) => pending.get(row.ticker) ?? row
            ),
          };
          pending.clear();
          draftRef.current = next;
          setData(next);
        };

        const queueStock = (stock: SectorStockRow) => {
          pending.set(stock.ticker, stock);
          if (frame) return;
          frame = window.requestAnimationFrame(flush);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (requestId !== requestRef.current) {
            await reader.cancel();
            return;
          }
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as StreamEvent;
            if (event.type === "meta") {
              draftRef.current = event.data;
              setData(event.data);
              setTotal(event.data.stocks.length);
              setLoaded(0);
            } else if (event.type === "stock") {
              setLoaded(event.loaded);
              setTotal(event.total);
              queueStock(event.stock);
            } else if (event.type === "complete") {
              if (frame) window.cancelAnimationFrame(frame);
              pending.clear();
              draftRef.current = event.data;
              setData(event.data);
              setLoaded(event.data.stocks.length);
              setTotal(event.data.stocks.length);
              writeStored(key, event.data);
            } else if (event.type === "error") {
              throw new Error(event.message || "Could not load screener data.");
            }
          }
        }
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setError(
          err instanceof Error ? err.message : "Could not load screener data."
        );
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [key, url]
  );

  const reload = useCallback(() => load(true), [load]);

  useEffect(() => {
    void load(false);
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  return { data, error, loading, loaded, total, reload };
}
