import { differenceInDays, format, startOfDay } from "date-fns";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { JournalMarketRegionId } from "@/lib/journal-market-regions";
import { MAJOR_MARKET_INDICES } from "@/lib/major-market-indices";
import {
  getPortfolioTimeframeRange,
  type PortfolioChartTimeframe,
} from "@/lib/portfolio-timeline";

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";
const FETCH_TIMEOUT_MS = 10_000;

type PriceBar = { ts: number; close: number; date: string };

export type BenchmarkHistoryPoint = {
  date: string;
  value: number;
};

export type BenchmarkHistory = {
  xirr: number | null;
  periodReturn: number | null;
  points: BenchmarkHistoryPoint[];
};

function timeframeToYahooRange(timeframe: PortfolioChartTimeframe): string {
  if (timeframe === "1d") return "1d";
  if (timeframe === "3d" || timeframe === "7d") return "5d";
  if (timeframe === "15d" || timeframe === "1m") return "1mo";
  if (timeframe === "6m") return "6mo";
  if (timeframe === "1y") return "1y";
  if (timeframe === "3y") return "3y";
  if (timeframe === "5y") return "5y";
  return "max";
}

function mapYahooCloses(result: {
  timestamp?: number[];
  indicators?: { quote?: Array<{ close?: Array<number | null> }> };
}): PriceBar[] {
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
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
    bars.push({
      ts: ts * 1000,
      close,
      date: format(new Date(ts * 1000), "yyyy-MM-dd"),
    });
  }

  return bars.sort((a, b) => a.ts - b.ts);
}

function priceAtOrBefore(bars: PriceBar[], target: Date): number | null {
  const targetMs = startOfDay(target).getTime();
  let last: number | null = null;
  for (const bar of bars) {
    if (bar.ts <= targetMs) last = bar.close;
    else break;
  }
  return last;
}

function periodReturnPercent(
  startPrice: number,
  endPrice: number
): number | null {
  if (startPrice <= 0 || endPrice <= 0) return null;
  const pct = (endPrice / startPrice - 1) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) > 9_999) return null;
  return Math.round(pct * 100) / 100;
}

function resolveStartPrice(
  bars: PriceBar[],
  from: Date | undefined
): number | null {
  if (bars.length === 0) return null;
  if (from) {
    return priceAtOrBefore(bars, from) ?? bars[0]?.close ?? null;
  }
  return bars[0]?.close ?? null;
}
function annualizedReturnPercent(
  startPrice: number,
  endPrice: number,
  days: number
): number | null {
  if (startPrice <= 0 || endPrice <= 0 || days <= 0) return null;
  const totalReturn = endPrice / startPrice;
  const annualized = (Math.pow(totalReturn, 365 / days) - 1) * 100;
  if (!Number.isFinite(annualized) || Math.abs(annualized) > 9_999) return null;
  return Math.round(annualized * 100) / 100;
}

/** Main indexes that are not part of the sidebar index list. */
const EXTRA_BENCHMARK_SYMBOLS: Record<string, string> = {
  tsx: "^GSPTSE",
  aex: "^AEX",
  smi: "^SSMI",
  ipc: "^MXX",
};

function yahooSymbolForIndex(indexId: string): string | null {
  const listed = MAJOR_MARKET_INDICES.find((item) => item.id === indexId);
  if (listed) return listed.yahooSymbol;
  return EXTRA_BENCHMARK_SYMBOLS[indexId] ?? null;
}

/** Benchmark for the journal country selector. India is the Nifty 50; the US is SPY. */
export function benchmarkForRegion(regionId: JournalMarketRegionId): {
  id: string;
  label: string;
} {
  switch (regionId) {
    case "IN":
      return { id: "nifty50", label: "Nifty 50" };
    case "US":
      return { id: "spy", label: "SPY" };
    case "UK":
      return { id: "ftse", label: "FTSE 100" };
    case "CA":
      return { id: "tsx", label: "S&P/TSX" };
    case "DE":
      return { id: "dax", label: "DAX" };
    case "FR":
      return { id: "cac", label: "CAC 40" };
    case "NL":
      return { id: "aex", label: "AEX" };
    case "CH":
      return { id: "smi", label: "SMI" };
    case "HK":
      return { id: "hsi", label: "Hang Seng" };
    case "AU":
      return { id: "asx", label: "ASX 200" };
    case "JP":
      return { id: "nikkei", label: "Nikkei 225" };
    case "KR":
      return { id: "kospi", label: "KOSPI" };
    case "SG":
      return { id: "sti", label: "STI" };
    case "BR":
      return { id: "bovespa", label: "Bovespa" };
    case "MX":
      return { id: "ipc", label: "IPC" };
    default:
      return { id: "spy", label: "SPY" };
  }
}

async function fetchBenchmarkBars(
  indexId: string,
  timeframe: PortfolioChartTimeframe
): Promise<PriceBar[]> {
  const yahooSymbol = yahooSymbolForIndex(indexId);
  if (!yahooSymbol) return [];

  const url = new URL(
    `${YAHOO_CHART}/${encodeURIComponent(yahooSymbol)}`
  );
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", timeframeToYahooRange(timeframe));

  const res = await fetchWithTimeout(
    url.toString(),
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": YAHOO_USER_AGENT,
      },
    },
    FETCH_TIMEOUT_MS
  );

  if (!res.ok) return [];

  const payload = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };

  return mapYahooCloses(payload.chart?.result?.[0] ?? {});
}

export async function fetchBenchmarkHistory(
  indexId: string,
  timeframe: PortfolioChartTimeframe,
  anchorValue: number,
  now = new Date()
): Promise<BenchmarkHistory> {
  const bars = await fetchBenchmarkBars(indexId, timeframe);
  if (bars.length === 0) {
    return { xirr: null, periodReturn: null, points: [] };
  }

  const { from, to } = getPortfolioTimeframeRange(timeframe, now);
  const endPrice = bars[bars.length - 1]?.close ?? null;
  const startPrice = resolveStartPrice(bars, from);

  if (startPrice == null || endPrice == null || startPrice <= 0) {
    return { xirr: null, periodReturn: null, points: [] };
  }

  const startDate = from ?? new Date(bars[0].ts);
  const endDate = to ?? now;
  const days = Math.max(differenceInDays(endDate, startDate), 1);
  const periodReturn = periodReturnPercent(startPrice, endPrice);
  const xirr =
    bars.length >= 2
      ? annualizedReturnPercent(startPrice, endPrice, days)
      : null;
  const scale = anchorValue > 0 ? anchorValue / startPrice : 1;

  const startMs = startOfDay(startDate).getTime();
  const endMs = startOfDay(endDate).getTime();
  const points: BenchmarkHistoryPoint[] = [];

  for (const bar of bars) {
    const barMs = startOfDay(new Date(bar.ts)).getTime();
    if (barMs < startMs || barMs > endMs) continue;
    points.push({
      date: bar.date,
      value: Math.round(bar.close * scale * 100) / 100,
    });
  }

  if (points.length === 0) {
    points.push({
      date: format(startOfDay(startDate), "yyyy-MM-dd"),
      value: Math.round(startPrice * scale * 100) / 100,
    });
  }

  const lastPoint = points[points.length - 1];
  const endKey = format(startOfDay(endDate), "yyyy-MM-dd");
  if (lastPoint?.date !== endKey) {
    points.push({
      date: endKey,
      value: Math.round(endPrice * scale * 100) / 100,
    });
  }

  return { xirr, periodReturn, points };
}

export async function fetchBenchmarkXirrPercent(
  indexId: string,
  timeframe: PortfolioChartTimeframe,
  now = new Date()
): Promise<number | null> {
  const history = await fetchBenchmarkHistory(indexId, timeframe, 1, now);
  return history.xirr;
}

export function defaultBenchmarkIdForCurrency(currency: string): string {
  if (currency === "INR") return "nifty50";
  if (currency === "GBP") return "ftse";
  if (currency === "EUR") return "dax";
  if (currency === "JPY") return "nikkei";
  return "spy";
}

export const PORTFOLIO_BENCHMARK_OPTIONS = MAJOR_MARKET_INDICES.filter(
  (index) =>
    ["nifty50", "spy", "ftse", "dax", "nikkei", "hsi", "asx"].includes(
      index.id
    )
);
