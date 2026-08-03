import type { ListingMarketId } from "@/lib/equity-listing-markets";

export type OhlcvBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PositionMarketData = {
  ticker: string;
  listingMarket: ListingMarketId;
  entryDate: string;
  daysSinceEntry: number;
  asOf: string;
  today: OhlcvBar;
  previousClose: number;
  avgVolume20d: number;
  volumeRatio: number;
  atr14: number;
  priceMovePct: number;
  priceMoveAbs: number;
  priceMoveAtrMultiple: number;
  provider: string;
};

export type PositionMarketDataOptions = {
  listingMarket?: ListingMarketId;
  asOf?: Date;
};
