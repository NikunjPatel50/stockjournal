import type { ListingMarketId } from "@/lib/equity-listing-markets";
import type { OhlcvBar } from "@/lib/trade-pulse/types";

export type MarketDataProvider = {
  id: string;
  fetchDailyBars: (
    ticker: string,
    listingMarket: ListingMarketId,
    options?: { asOf?: Date }
  ) => Promise<OhlcvBar[]>;
};
