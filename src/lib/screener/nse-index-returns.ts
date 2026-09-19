import { fetchWithTimeout, extractResponseCookies } from "@/lib/fetch-with-timeout";
import {
  emptyPeriodChanges,
  type PeriodChanges,
} from "@/lib/screener/types";
import {
  isNseAllSectorId,
  NSE_ALL_SECTOR_IDS,
  NSE_INDEX_SYMBOL_BY_SECTOR_ID,
} from "@/lib/screener/nse-all-sectors";

type NseAllSectorId = (typeof NSE_ALL_SECTOR_IDS)[number];

const NSE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const NSE_FETCH_TIMEOUT_MS = 15_000;

const NSE_FETCH_HEADERS = {
  "User-Agent": NSE_USER_AGENT,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
  Connection: "keep-alive",
};

export type NseIndexQuote = {
  indexSymbol: string;
  index: string;
  last: number;
  percentChange: number | null;
  oneWeekAgoVal: number | null;
  oneYearAgoVal: number | null;
  perChange30d: number | null;
  perChange365d: number | null;
};

let nseCookieCache: { cookie: string; expiresAt: number } | null = null;
let nseIndicesCache: {
  bySymbol: Map<string, NseIndexQuote>;
  at: number;
} | null = null;

const NSE_INDICES_TTL_MS = 5 * 60 * 1000;

async function getNseCookie(force = false): Promise<string | null> {
  if (
    !force &&
    nseCookieCache &&
    Date.now() < nseCookieCache.expiresAt
  ) {
    return nseCookieCache.cookie;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetchWithTimeout(
        "https://www.nseindia.com/",
        {
          headers: NSE_FETCH_HEADERS,
          cache: "no-store",
        },
        NSE_FETCH_TIMEOUT_MS
      );
      const cookie = extractResponseCookies(res);
      if (!cookie) continue;

      nseCookieCache = {
        cookie,
        expiresAt: Date.now() + 30 * 60 * 1000,
      };
      return cookie;
    } catch {
      // Retry once with a fresh cookie handshake.
    }
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function periodReturnPercent(start: number | null, end: number | null): number | null {
  if (start == null || end == null || start <= 0 || end <= 0) return null;
  const pct = ((end - start) / start) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) > 9_999) return null;
  return Math.round(pct * 100) / 100;
}

export function periodChangesFromNseQuote(quote: NseIndexQuote): PeriodChanges {
  const changes = emptyPeriodChanges();
  changes["1d"] = quote.percentChange;
  changes["1w"] = periodReturnPercent(quote.oneWeekAgoVal, quote.last);
  changes["1m"] = quote.perChange30d;
  changes["1y"] =
    periodReturnPercent(quote.oneYearAgoVal, quote.last) ??
    (quote.perChange365d != null && quote.perChange365d !== 0
      ? quote.perChange365d
      : null);
  return changes;
}

export function mergeNseWithSupplementalChanges(
  nse: PeriodChanges,
  supplemental: PeriodChanges
): PeriodChanges {
  return {
    ...nse,
    "3m": nse["3m"] ?? supplemental["3m"],
    "6m": nse["6m"] ?? supplemental["6m"],
    "1y": nse["1y"] ?? supplemental["1y"],
    "3y": nse["3y"] ?? supplemental["3y"],
  };
}

export function needsSupplementalSectorPeriods(changes: PeriodChanges): boolean {
  return (
    changes["3m"] == null ||
    changes["6m"] == null ||
    changes["1y"] == null ||
    changes["3y"] == null
  );
}

function parseNseIndexRow(row: Record<string, unknown>): NseIndexQuote | null {
  const indexSymbol = String(row.indexSymbol ?? "").trim();
  const index = String(row.index ?? "").trim();
  const last = toNumber(row.last);
  if (!indexSymbol || last == null) return null;

  return {
    indexSymbol,
    index,
    last,
    percentChange: toNumber(row.percentChange),
    oneWeekAgoVal: toNumber(row.oneWeekAgoVal),
    oneYearAgoVal: toNumber(row.oneYearAgoVal),
    perChange30d: toNumber(row.perChange30d),
    perChange365d: toNumber(row.perChange365d),
  };
}

async function fetchNseIndexDirectory(
  cookie: string
): Promise<Map<string, NseIndexQuote> | null> {
  try {
    const res = await fetchWithTimeout(
      "https://www.nseindia.com/api/allIndices",
      {
        cache: "no-store",
        headers: {
          ...NSE_FETCH_HEADERS,
          Cookie: cookie,
        },
      },
      NSE_FETCH_TIMEOUT_MS
    );
    if (!res.ok) return null;

    const payload = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const bySymbol = new Map<string, NseIndexQuote>();
    for (const row of payload.data ?? []) {
      const quote = parseNseIndexRow(row);
      if (!quote) continue;
      bySymbol.set(quote.indexSymbol, quote);
      bySymbol.set(quote.index.toUpperCase(), quote);
    }

    return bySymbol.size > 0 ? bySymbol : null;
  } catch {
    return null;
  }
}

export async function loadNseIndexDirectory(
  fresh = false
): Promise<Map<string, NseIndexQuote>> {
  if (!fresh && nseIndicesCache && Date.now() - nseIndicesCache.at < NSE_INDICES_TTL_MS) {
    return nseIndicesCache.bySymbol;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const cookie = await getNseCookie(fresh || attempt > 0);
    if (!cookie) continue;

    const bySymbol = await fetchNseIndexDirectory(cookie);
    if (!bySymbol) continue;

    nseIndicesCache = { bySymbol, at: Date.now() };
    return bySymbol;
  }

  return nseIndicesCache?.bySymbol ?? new Map();
}

export function nseQuoteForSectorId(
  sectorId: string,
  directory: Map<string, NseIndexQuote>
): NseIndexQuote | null {
  if (!isNseAllSectorId(sectorId)) return null;
  const symbol = NSE_INDEX_SYMBOL_BY_SECTOR_ID[sectorId as NseAllSectorId];
  if (!symbol) return null;
  return directory.get(symbol) ?? directory.get(symbol.toUpperCase()) ?? null;
}
