import { tradePulseConfig } from "@/lib/trade-pulse/config";
import { eodhdMarketDataProvider } from "@/lib/trade-pulse/providers/eodhd-historical";
import type { MarketDataProvider } from "@/lib/trade-pulse/providers/market-data-provider";
import { yahooMarketDataProvider } from "@/lib/trade-pulse/providers/yahoo-historical";

const providers: Record<string, MarketDataProvider> = {
  yahoo: yahooMarketDataProvider,
  eodhd: eodhdMarketDataProvider,
};

export function getMarketDataProvider(): MarketDataProvider {
  return providers[tradePulseConfig.marketDataProvider] ?? yahooMarketDataProvider;
}
