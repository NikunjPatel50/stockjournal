import { useCallback, useEffect, useState } from "react";

const CLIENT_TTL_MS = 20 * 60 * 1000;
const STORAGE_PREFIX = "sj.screener.v6.";

type CacheEntry<T> = {
  data: T;
  at: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function cacheKey(url: string) {
  return url.replace(/([?&])fresh=1&?/, "$1").replace(/[?&]$/, "");
}

function readStored<T>(key: string): CacheEntry<T> | undefined {
  const memory = cache.get(key);
  if (memory) return memory as CacheEntry<T>;
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed?.data || Date.now() - parsed.at >= CLIENT_TTL_MS) return undefined;
    cache.set(key, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

function writeStored<T>(key: string, data: T) {
  const entry = { data, at: Date.now() };
  cache.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Ignore quota errors.
  }
}

async function requestScreenerJson<T>(url: string, fresh: boolean): Promise<T> {
  const key = cacheKey(url);
  if (!fresh) {
    const hit = readStored<T>(key);
    if (hit && Date.now() - hit.at < CLIENT_TTL_MS) {
      return hit.data;
    }
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const request = (async () => {
    const nextUrl =
      fresh && !url.includes("fresh=1")
        ? `${url}${url.includes("?") ? "&" : "?"}fresh=1`
        : url;
    const res = await fetch(nextUrl, {
      cache: fresh ? "no-store" : "default",
    });
    if (!res.ok) {
      throw new Error(
        res.status === 403
          ? "This screener is private."
          : "Could not load screener data."
      );
    }
    const data = (await res.json()) as T;
    writeStored(key, data);
    return data;
  })();

  inflight.set(key, request);
  try {
    return await request;
  } finally {
    if (inflight.get(key) === request) inflight.delete(key);
  }
}

export function prefetchScreenerJson(url: string) {
  return requestScreenerJson(url, false).catch(() => undefined);
}

export function useScreenerJson<T>(url: string | null) {
  const key = url ? cacheKey(url) : null;
  // Keep the first render identical on server and client; hydrate cache in useEffect.
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => Boolean(url));

  const load = useCallback(
    async (fresh = false) => {
      if (!url || !key) {
        setData(null);
        setLoading(false);
        return;
      }

      const hit = readStored<T>(key);
      if (!fresh && hit && Date.now() - hit.at < CLIENT_TTL_MS) {
        setData(hit.data);
        setError(null);
        setLoading(false);
        return;
      }

      if (!hit) setLoading(true);
      setError(null);
      try {
        const next = await requestScreenerJson<T>(url, fresh);
        setData(next);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load screener data."
        );
        if (!hit) setData(null);
      } finally {
        setLoading(false);
      }
    },
    [key, url]
  );

  const reload = useCallback(() => load(true), [load]);

  useEffect(() => {
    if (!key) {
      setData(null);
      setLoading(false);
      return;
    }

    const hit = readStored<T>(key);
    if (hit && Date.now() - hit.at < CLIENT_TTL_MS) {
      setData(hit.data);
      setError(null);
      setLoading(false);
      return;
    }

    void load(false);
  }, [key, load]);

  return { data, error, loading, reload };
}
