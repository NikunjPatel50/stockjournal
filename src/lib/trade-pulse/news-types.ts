import type { ListingMarketId } from "@/lib/equity-listing-markets";

export type TradePulseNewsItem = {
  headline: string;
  source: string;
  publishedAt: string;
  summary: string;
  url?: string;
  provider: "yahoo" | "google";
};

export type RecentNewsOptions = {
  listingMarket?: ListingMarketId;
  companyName?: string;
  limit?: number;
  asOf?: Date;
};
