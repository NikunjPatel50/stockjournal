import { subDays } from "date-fns";
import { yahooSymbolForListingMarket } from "@/lib/equity-listing-markets";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  emptyPeriodChanges,
  SCREENER_PERIODS,
  SCREENER_PERIOD_LOOKBACK_DAYS,
  type PeriodChanges,
  type ScreenerChartPoint,
} from "@/lib/screener/types";

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";
const FETCH_TIMEOUT_MS = 10_000;

type PriceBar = {
  ts: number;
  close: number;
  high: number;
  date: string;
};

export type SymbolReturnSnapshot = {
  symbol: string;
  lastPrice: number | null;
  changes: PeriodChanges;
  chart: ScreenerChartPoint[];
};

function periodReturnPercent(start: number, end: number): number | null {
  if (start <= 0 || end <= 0) return null;
  const pct = ((end - start) / start) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) > 9_999) return null;
  return Math.round(pct * 100) / 100;
}

function closeAtOrBefore(bars: PriceBar[], targetMs: number): number | null {
  let last: number | null = null;
  for (const bar of bars) {
    if (bar.ts <= targetMs) last = bar.close;
    else break;
  }
  return last;
}

function computeChanges(
  bars: PriceBar[],
  lastPrice: number,
  previousClose: number | null
): PeriodChanges {
  const changes = emptyPeriodChanges();
  if (bars.length === 0 || lastPrice <= 0) return changes;

  changes["1d"] =
    previousClose != null && previousClose > 0
      ? periodReturnPercent(previousClose, lastPrice)
      : null;

  const tradingOffsets: Partial<Record<string, number>> = {
    "1w": 5,
    "1m": 21,
    "3m": 63,
    "6m": 126,
    "1y": 252,
    "3y": 756,
  };

  for (const period of SCREENER_PERIODS) {
    if (period === "1d") continue;
    const offset = tradingOffsets[period];
    const start =
      offset != null && bars.length > offset
        ? bars[bars.length - 1 - offset]?.close ?? null
        : closeAtOrBefore(
            bars,
            subDays(
              new Date(bars[bars.length - 1]?.ts ?? Date.now()),
              SCREENER_PERIOD_LOOKBACK_DAYS[period]
            ).getTime()
          );
    changes[period] = start != null ? periodReturnPercent(start, lastPrice) : null;
  }

  return changes;
}

function mapBars(result: {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
      high?: Array<number | null>;
    }>;
  };
}): PriceBar[] {
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const highs = result.indicators?.quote?.[0]?.high ?? [];
  const bars: PriceBar[] = [];

  for (let index = 0; index < timestamps.length; index += 1) {
    const close = closes[index];
    const ts = timestamps[index];
    if (
      typeof close !== "number" ||
      !Number.isFinite(close) ||
      close <= 0 ||
      !Number.isFinite(ts)
    ) {
      continue;
    }
    const high = highs[index];
    bars.push({
      ts: ts * 1000,
      close,
      high:
        typeof high === "number" && Number.isFinite(high) && high > 0
          ? high
          : close,
      date: new Date(ts * 1000).toISOString().slice(0, 10),
    });
  }

  return bars.sort((a, b) => a.ts - b.ts);
}

export async function fetchYahooReturnSnapshot(
  symbol: string,
  options?: { fresh?: boolean }
): Promise<SymbolReturnSnapshot> {
  const empty: SymbolReturnSnapshot = {
    symbol,
    lastPrice: null,
    changes: emptyPeriodChanges(),
    chart: [],
  };
  if (!symbol) return empty;

  const url = new URL(`${YAHOO_CHART}/${encodeURIComponent(symbol)}`);
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "5y");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,split");

  try {
    const res = await fetchWithTimeout(
      url.toString(),
      options?.fresh
        ? {
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "User-Agent": YAHOO_USER_AGENT,
            },
          }
        : {
            headers: {
              Accept: "application/json",
              "User-Agent": YAHOO_USER_AGENT,
            },
            next: { revalidate: 30 * 60, tags: ["screener-yahoo"] },
          },
      FETCH_TIMEOUT_MS
    );
    if (!res.ok) return empty;

    const payload = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
          };
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              close?: Array<number | null>;
              high?: Array<number | null>;
            }>;
          };
        }>;
      };
    };

    const result = payload.chart?.result?.[0];
    if (!result) return empty;

    const bars = mapBars(result);
    const lastClose = bars[bars.length - 1]?.close ?? null;
    const lastPrice =
      typeof result.meta?.regularMarketPrice === "number" &&
      result.meta.regularMarketPrice > 0
        ? result.meta.regularMarketPrice
        : lastClose;

    const metaPrevious =
      (typeof result.meta?.chartPreviousClose === "number" &&
      result.meta.chartPreviousClose > 0
        ? result.meta.chartPreviousClose
        : null) ??
      (typeof result.meta?.previousClose === "number" &&
      result.meta.previousClose > 0
        ? result.meta.previousClose
        : null);
    const barPrevious = bars[bars.length - 2]?.close ?? null;
    const previousClose =
      metaPrevious != null &&
      lastPrice != null &&
      Math.abs(metaPrevious - lastPrice) / lastPrice > 0.25
        ? barPrevious
        : metaPrevious ?? barPrevious;

    if (lastPrice == null || lastPrice <= 0) return empty;

    return {
      symbol,
      lastPrice: Math.round(lastPrice * 100) / 100,
      changes: computeChanges(bars, lastPrice, previousClose),
      chart: bars.map((bar) => ({
        date: bar.date,
        close: Math.round(bar.close * 100) / 100,
        high: Math.round(bar.high * 100) / 100,
      })),
    };
  } catch {
    return empty;
  }
}

export function yahooSymbolForNseTicker(ticker: string): string {
  return yahooSymbolForListingMarket(ticker, "IN_NSE");
}

export function subtractPeriodChanges(
  left: PeriodChanges,
  right: PeriodChanges
): PeriodChanges {
  const next = emptyPeriodChanges();
  for (const period of SCREENER_PERIODS) {
    const a = left[period];
    const b = right[period];
    next[period] =
      a != null && b != null ? Math.round((a - b) * 100) / 100 : null;
  }
  return next;
}

export function hasSparsePeriodHistory(changes: PeriodChanges): boolean {
  return SCREENER_PERIODS.filter((period) => period !== "1d").some(
    (period) => changes[period] == null
  );
}

export function mergeIndexAndBasketChanges(
  indexChanges: PeriodChanges,
  basketChanges: PeriodChanges
): PeriodChanges {
  const next = emptyPeriodChanges();
  for (const period of SCREENER_PERIODS) {
    next[period] = indexChanges[period] ?? basketChanges[period];
  }
  return next;
}

/** Prefer constituent basket when Yahoo index history is too thin to trust. */
export function preferBasketWhenIndexThin(
  indexChanges: PeriodChanges,
  basketChanges: PeriodChanges
): PeriodChanges {
  const next = emptyPeriodChanges();
  for (const period of SCREENER_PERIODS) {
    const basket = basketChanges[period];
    const index = indexChanges[period];
    next[period] = basket ?? index;
  }
  return next;
}

export function hasThinIndexHistory(snapshot: SymbolReturnSnapshot): boolean {
  return (
    snapshot.chart.length < 10 || hasSparsePeriodHistory(snapshot.changes)
  );
}

export function averagePeriodChanges(list: PeriodChanges[]): PeriodChanges {
  const next = emptyPeriodChanges();
  for (const period of SCREENER_PERIODS) {
    const values = list
      .map((changes) => changes[period])
      .filter((value): value is number => value != null && Number.isFinite(value));
    if (values.length === 0) continue;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    next[period] = Math.round(mean * 100) / 100;
  }
  return next;
}

