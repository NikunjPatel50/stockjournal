import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  parseNseEquityCsv,
  type NseDirectorySymbol,
} from "@/lib/nse-symbol-directory-shared";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type { NseDirectorySymbol } from "@/lib/nse-symbol-directory-shared";
export { filterNseSymbolDirectory } from "@/lib/nse-symbol-directory-shared";

let directoryCache: {
  symbols: NseDirectorySymbol[];
  expiresAt: number;
} | null = null;
let directoryLoadPromise: Promise<NseDirectorySymbol[]> | null = null;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NSE_FETCH_TIMEOUT_MS = 20_000;
const NSE_EQUITY_CSV_URL =
  "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv";
const BUNDLED_SYMBOLS_PATH = path.join(
  process.cwd(),
  "public/data/nse-equity-symbols.json"
);

type BundledNseSymbol = {
  c: string;
  n: string;
};

async function loadBundledNseSymbolDirectory(): Promise<NseDirectorySymbol[]> {
  try {
    const raw = await readFile(BUNDLED_SYMBOLS_PATH, "utf8");
    const data = JSON.parse(raw) as BundledNseSymbol[];
    return data.map(({ c, n }) => ({ code: c, name: n }));
  } catch {
    return [];
  }
}

async function loadNseSymbolDirectory(): Promise<NseDirectorySymbol[]> {
  try {
    const url = new URL(NSE_EQUITY_CSV_URL);
    url.searchParams.set("_", String(Date.now()));
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/csv,*/*",
        },
      },
      NSE_FETCH_TIMEOUT_MS
    );
    if (!res.ok) return [];

    const text = await res.text();
    const symbols = parseNseEquityCsv(text);
    if (symbols.length === 0) return [];

    directoryCache = {
      symbols,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return symbols;
  } catch {
    return [];
  }
}

/** Live NSE CSV first, bundled file as fallback. */
export async function getFreshNseSymbolDirectory(): Promise<NseDirectorySymbol[]> {
  if (directoryCache && Date.now() < directoryCache.expiresAt) {
    return directoryCache.symbols;
  }

  if (!directoryLoadPromise) {
    directoryLoadPromise = (async () => {
      const live = await loadNseSymbolDirectory();
      if (live.length > 0) return live;

      const bundled = await loadBundledNseSymbolDirectory();
      if (bundled.length > 0) {
        directoryCache = {
          symbols: bundled,
          expiresAt: Date.now() + CACHE_TTL_MS,
        };
        return bundled;
      }

      return directoryCache?.symbols ?? [];
    })().finally(() => {
      directoryLoadPromise = null;
    });
  }

  return directoryLoadPromise;
}

/** Bundled file first for fast cold starts; live CSV only if bundle missing. */
export async function getNseSymbolDirectory(): Promise<NseDirectorySymbol[]> {
  if (directoryCache && Date.now() < directoryCache.expiresAt) {
    return directoryCache.symbols;
  }

  const bundled = await loadBundledNseSymbolDirectory();
  if (bundled.length > 0) {
    directoryCache = {
      symbols: bundled,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return bundled;
  }

  if (!directoryLoadPromise) {
    directoryLoadPromise = loadNseSymbolDirectory().finally(() => {
      directoryLoadPromise = null;
    });
  }

  return directoryLoadPromise;
}
