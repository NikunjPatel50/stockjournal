import { defaultListingMarketForCurrency } from "@/lib/equity-listing-markets";
import { DEFAULT_CURRENCY } from "@/lib/settings";
import { buildPositionMarketData } from "@/lib/trade-pulse/indicators";
import { getMarketDataProvider } from "@/lib/trade-pulse/providers";
import type {
  PositionMarketData,
  PositionMarketDataOptions,
} from "@/lib/trade-pulse/types";

/**
 * Fetches today's OHLCV plus derived volume/ATR anomaly metrics for a position.
 *
 * Market data source is controlled by `TRADE_PULSE_MARKET_DATA_PROVIDER`
 * (`yahoo` default | `eodhd`).
 */
export async function getPositionMarketData(
  ticker: string,
  entryDate: string,
  options: PositionMarketDataOptions = {}
): Promise<PositionMarketData | null> {
  const listingMarket =
    options.listingMarket ?? defaultListingMarketForCurrency(DEFAULT_CURRENCY);
  const asOf = options.asOf ?? new Date();
  const provider = getMarketDataProvider();

  const bars = await provider.fetchDailyBars(ticker, listingMarket, { asOf });
  if (bars.length === 0) return null;

  return buildPositionMarketData({
    ticker,
    listingMarket,
    entryDate,
    bars,
    provider: provider.id,
    asOf,
  });
}
