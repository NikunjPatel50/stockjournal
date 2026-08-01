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
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketTime?: number;
};

async function fetchYahooChartSymbol(
  symbol: string,
  fallbackCurrency?: CurrencyCode
): Promise<MarketQuote | null> {
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
      chart?: { result?: Array<{ meta?: YahooChartMeta }> };
    };
    const meta = payload.chart?.result?.[0]?.meta;
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
    };
  } catch {
    return null;
  }
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
