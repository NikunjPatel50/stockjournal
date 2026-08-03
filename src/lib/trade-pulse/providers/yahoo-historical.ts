import { format } from "date-fns";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { yahooSymbolForListingMarket, type ListingMarketId } from "@/lib/equity-listing-markets";
import type { OhlcvBar } from "@/lib/trade-pulse/types";
import type { MarketDataProvider } from "@/lib/trade-pulse/providers/market-data-provider";

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; SwingTradingLog/1.0)";
const FETCH_TIMEOUT_MS = 8000;

type YahooChartResult = {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
};

function toNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapYahooBars(result: YahooChartResult): OhlcvBar[] {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];

  const bars: OhlcvBar[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const open = toNumber(quote.open?.[index]);
    const high = toNumber(quote.high?.[index]);
    const low = toNumber(quote.low?.[index]);
    const close = toNumber(quote.close?.[index]);
    const volume = toNumber(quote.volume?.[index]);
    const ts = timestamps[index];

    if (
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      volume == null ||
      !Number.isFinite(ts)
    ) {
      continue;
    }

    bars.push({
      date: format(new Date(ts * 1000), "yyyy-MM-dd"),
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return bars;
}

export async function fetchYahooDailyBars(
  ticker: string,
  listingMarket: ListingMarketId
): Promise<OhlcvBar[]> {
  const symbol = yahooSymbolForListingMarket(ticker, listingMarket);
  if (!symbol) return [];

  const url = new URL(`${YAHOO_CHART}/${encodeURIComponent(symbol)}`);
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "6mo");

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
    chart?: { result?: YahooChartResult[] };
  };

  return mapYahooBars(payload.chart?.result?.[0] ?? {});
}

export const yahooMarketDataProvider: MarketDataProvider = {
  id: "yahoo",
  fetchDailyBars: fetchYahooDailyBars,
};
