import type { NseDirectorySymbol } from "@/lib/nse-symbol-directory-shared";

let directoryCache: NseDirectorySymbol[] | null = null;
let directoryLoadPromise: Promise<NseDirectorySymbol[]> | null = null;
let refreshPromise: Promise<void> | null = null;

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REFRESH_STORAGE_KEY = "nse-symbols-refreshed-at";

type BundledNseSymbol = {
  c: string;
  n: string;
};

function shouldRefreshFromApi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(REFRESH_STORAGE_KEY) ?? "0");
    return Date.now() - last > REFRESH_INTERVAL_MS;
  } catch {
    return true;
  }
}

function markRefreshedFromApi(): void {
  try {
    sessionStorage.setItem(REFRESH_STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
}

async function loadBundledNseSymbolDirectory(): Promise<NseDirectorySymbol[]> {
  const res = await fetch("/data/nse-equity-symbols.json", {
    cache: "force-cache",
  });
  if (!res.ok) throw new Error("nse_directory_unavailable");
  const data = (await res.json()) as BundledNseSymbol[];
  return data.map(({ c, n }) => ({ code: c, name: n }));
}

async function refreshFromApi(): Promise<void> {
  if (!shouldRefreshFromApi()) return;

  try {
    const res = await fetch("/api/nse-symbols", { cache: "no-store" });
    if (!res.ok) return;

    const data = (await res.json()) as {
      symbols?: NseDirectorySymbol[];
    };
    const fresh = data.symbols ?? [];
    if (fresh.length === 0) return;

    if (!directoryCache || fresh.length >= directoryCache.length) {
      directoryCache = fresh;
    }
    markRefreshedFromApi();
  } catch {
    // keep bundled cache
  }
}

function scheduleBackgroundRefresh(): void {
  if (refreshPromise) return;
  refreshPromise = refreshFromApi().finally(() => {
    refreshPromise = null;
  });
}

export async function getClientNseSymbolDirectory(): Promise<NseDirectorySymbol[]> {
  if (directoryCache) {
    scheduleBackgroundRefresh();
    return directoryCache;
  }

  if (!directoryLoadPromise) {
    directoryLoadPromise = loadBundledNseSymbolDirectory()
      .then((symbols) => {
        directoryCache = symbols;
        scheduleBackgroundRefresh();
        return symbols;
      })
      .finally(() => {
        directoryLoadPromise = null;
      });
  }

  return directoryLoadPromise;
}
