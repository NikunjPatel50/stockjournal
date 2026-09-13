import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { parseYahooNumeric } from "@/lib/yahoo-fundamentals";
import { getYahooAuth } from "@/lib/yahoo-earnings";
import {
  getScreenerCache,
  SCREENER_EOD_CACHE_TTL_MS,
  setScreenerCache,
} from "@/lib/screener/cache";
import { yahooSymbolForNseTicker } from "@/lib/screener/yahoo-returns";

const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";
const FETCH_TIMEOUT_MS = 7000;
const QUALITY_CONCURRENCY = 8;

export type QualityFundamentals = {
  roe: number | null;
  roa: number | null;
  roce: number | null;
  debtToEquity: number | null;
  insiderPct: number | null;
  institutionPct: number | null;
};

const inflight = new Map<string, Promise<QualityFundamentals | null>>();

function asRatio(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.abs(value) > 2 ? value / 100 : value;
}

function cacheKey(ticker: string) {
  return `quality:${ticker}`;
}

export async function fetchQualityFundamentals(
  ticker: string,
  auth?: { cookie: string; crumb: string } | null,
  fresh = false
): Promise<QualityFundamentals | null> {
  const key = cacheKey(ticker);
  if (!fresh) {
    const cached = getScreenerCache<QualityFundamentals | null>(key);
    if (cached !== null && cached !== undefined) return cached;
    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const yahooSymbol = yahooSymbolForNseTicker(ticker);
  if (!yahooSymbol) return null;

  const request = (async () => {
    const resolvedAuth = auth ?? (await getYahooAuth());
    if (!resolvedAuth) return null;

    const url = new URL(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}`
    );
    url.searchParams.set("modules", "financialData,defaultKeyStatistics");
    url.searchParams.set("crumb", resolvedAuth.crumb);

    try {
      const res = await fetchWithTimeout(
        url.toString(),
        {
          cache: "no-store",
          headers: {
            "User-Agent": YAHOO_USER_AGENT,
            Cookie: resolvedAuth.cookie,
            Accept: "application/json",
          },
        },
        FETCH_TIMEOUT_MS
      );
      if (!res.ok) return null;

      const payload = (await res.json()) as {
        quoteSummary?: {
          result?: Array<{
            financialData?: {
              returnOnEquity?: unknown;
              returnOnAssets?: unknown;
              debtToEquity?: unknown;
            };
            defaultKeyStatistics?: {
              heldPercentInsiders?: unknown;
              heldPercentInstitutions?: unknown;
            };
          }>;
        };
      };

      const row = payload.quoteSummary?.result?.[0];
      if (!row) return null;

      const roe = asRatio(
        parseYahooNumeric(row.financialData?.returnOnEquity as never)
      );
      const roa = asRatio(
        parseYahooNumeric(row.financialData?.returnOnAssets as never)
      );
      const debtToEquity = asRatio(
        parseYahooNumeric(row.financialData?.debtToEquity as never)
      );
      const insiderPct = asRatio(
        parseYahooNumeric(
          row.defaultKeyStatistics?.heldPercentInsiders as never
        )
      );
      const institutionPct = asRatio(
        parseYahooNumeric(
          row.defaultKeyStatistics?.heldPercentInstitutions as never
        )
      );

      const quality: QualityFundamentals = {
        roe,
        roa,
        roce: roa,
        debtToEquity,
        insiderPct,
        institutionPct,
      };
      setScreenerCache(key, quality, SCREENER_EOD_CACHE_TTL_MS);
      return quality;
    } catch {
      return null;
    }
  })();

  inflight.set(key, request);
  try {
    return await request;
  } finally {
    if (inflight.get(key) === request) inflight.delete(key);
  }
}

export async function attachQualityFundamentals<T extends { ticker: string }>(
  rows: T[],
  fresh = false
): Promise<Array<T & QualityFundamentals>> {
  if (rows.length === 0) return [];

  const auth = await getYahooAuth();
  const tickers = [...new Set(rows.map((row) => row.ticker))];
  const qualities = await mapWithConcurrency(
    tickers,
    QUALITY_CONCURRENCY,
    (ticker) => fetchQualityFundamentals(ticker, auth, fresh)
  );
  const byTicker = new Map(
    tickers.map((ticker, index) => [ticker, qualities[index] ?? null])
  );

  return rows.map((row) => {
    const quality = byTicker.get(row.ticker);
    return {
      ...row,
      roe: quality?.roe ?? null,
      roa: quality?.roa ?? null,
      roce: quality?.roce ?? null,
      debtToEquity: quality?.debtToEquity ?? null,
      insiderPct: quality?.insiderPct ?? null,
      institutionPct: quality?.institutionPct ?? null,
    };
  });
}
