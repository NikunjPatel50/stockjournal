import type { EquityExchangeHint, MarketQuote } from "@/lib/eodhd";
import type { CurrencyCode } from "@/lib/settings";
import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  getListingMarket,
  yahooSymbolForListingMarket,
} from "@/lib/equity-listing-markets";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";

function cleanTicker(ticker: string): string {
  return normalizeEquityTicker(ticker);
}

function yahooSymbol(ticker: string, equityExchange: EquityExchangeHint): string {
  const base = cleanTicker(ticker);
  if (!base) return "";
  if (base.includes(".")) return base;
  return equityExchange === "NSE" ? `${base}.NS` : base;
}

function mapYahooCurrency(value?: string): CurrencyCode | undefined {
  const code = value?.trim().toUpperCase();
  if (
    code === "USD" ||
    code === "EUR" ||
    code === "GBP" ||
    code === "INR" ||
    code === "CAD"
  ) {
    return code;
  }
  return undefined;
}

type YahooChartMeta = {
  currency?: string;
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketTime?: number;
};

type YahooChartQuote = {
  open?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
  close?: Array<number | null>;
};

function firstValidValue(values?: Array<number | null>): number | null {
  if (!values) return null;
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
}

function extremaFromSeries(
  mode: "max" | "min",
  values?: Array<number | null>
): number | null {
  if (!values) return null;
  let result: number | null = null;
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      continue;
    }
    if (result == null) {
      result = value;
      continue;
    }
    result = mode === "max" ? Math.max(result, value) : Math.min(result, value);
  }
  return result;
}

function validMetaPrice(value?: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseOhlc(
  meta: YahooChartMeta,
  quote?: YahooChartQuote
): YahooQuoteWithOhlc["ohlc"] {
  const close = validMetaPrice(meta.regularMarketPrice);
  if (close == null) return null;

  const open =
    validMetaPrice(meta.regularMarketOpen) ??
    firstValidValue(quote?.open) ??
    validMetaPrice(meta.chartPreviousClose) ??
    validMetaPrice(meta.previousClose) ??
    null;

  const high =
    validMetaPrice(meta.regularMarketDayHigh) ??
    extremaFromSeries("max", quote?.high) ??
    close;

  const low =
    validMetaPrice(meta.regularMarketDayLow) ??
    extremaFromSeries("min", quote?.low) ??
    close;

  if (open == null || !Number.isFinite(open) || open <= 0) {
    return null;
  }

  return { open, high, low, close };
}

export type YahooQuoteWithOhlc = MarketQuote & {
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  } | null;
};

async function fetchYahooChartSymbol(
  symbol: string,
  fallbackCurrency?: CurrencyCode
): Promise<YahooQuoteWithOhlc | null> {
  if (!symbol) return null;

  const url = new URL(`${YAHOO_CHART}/${encodeURIComponent(symbol)}`);
  url.searchParams.set("interval", "1m");
  url.searchParams.set("range", "1d");

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; SwingTradingLog/1.0)",
      },
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: YahooChartMeta;
          indicators?: { quote?: YahooChartQuote[] };
        }>;
      };
    };
    const result = payload.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    if (price === undefined || !Number.isFinite(price) || price <= 0) {
      return null;
    }

    const previous =
      meta.chartPreviousClose ?? meta.previousClose ?? null;
    const changePercent =
      previous !== null &&
      Number.isFinite(previous) &&
      previous > 0
        ? Math.round(((price - previous) / previous) * 10000) / 100
        : null;

    const ts =
      typeof meta.regularMarketTime === "number" &&
      Number.isFinite(meta.regularMarketTime)
        ? meta.regularMarketTime
        : null;

    return {
      symbol: meta.symbol ?? symbol,
      price,
      changePercent,
      timestamp: ts,
      currency: mapYahooCurrency(meta.currency) ?? fallbackCurrency,
      ohlc: parseOhlc(meta, result?.indicators?.quote?.[0]),
    };
  } catch {
    return null;
  }
}

/** Near–real-time quote for any Yahoo symbol (indices, ETFs, equities). */
export async function fetchYahooQuoteBySymbol(
  symbol: string,
  fallbackCurrency?: CurrencyCode
): Promise<MarketQuote | null> {
  const quote = await fetchYahooChartSymbol(symbol, fallbackCurrency);
  if (!quote) return null;
  const { ohlc: _ohlc, ...marketQuote } = quote;
  return marketQuote;
}

/** Quote with same-day OHLC from Yahoo chart meta. */
export async function fetchYahooQuoteWithOhlc(
  symbol: string,
  fallbackCurrency?: CurrencyCode
): Promise<YahooQuoteWithOhlc | null> {
  return fetchYahooChartSymbol(symbol, fallbackCurrency);
}

/** Near–real-time equity quote via Yahoo chart API (server-side only). */
export async function fetchYahooEquityQuote(
  ticker: string,
  equityExchange: EquityExchangeHint
): Promise<MarketQuote | null> {
  return fetchYahooChartSymbol(yahooSymbol(ticker, equityExchange));
}

export async function fetchYahooEquityQuoteForMarket(
  ticker: string,
  marketId: ListingMarketId
): Promise<MarketQuote | null> {
  const market = getListingMarket(marketId);
  return fetchYahooChartSymbol(
    yahooSymbolForListingMarket(ticker, marketId),
    market.currency
  );
}
