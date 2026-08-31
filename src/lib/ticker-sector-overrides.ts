import type { AssetClass } from "@/lib/journal-types";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";

type TickerFundamentalsOverride = {
  sector?: string;
  marketCapBucket?: string;
};

/** Manual fundamentals when Yahoo data is missing or unreliable. */
const FUNDAMENTALS_OVERRIDES: Record<string, TickerFundamentalsOverride> = {
  ARTEMISMED: {
    sector: "Healthcare",
    marketCapBucket: "Small cap",
  },
  PRICOL: {
    sector: "Consumer Cyclical",
    marketCapBucket: "Mid cap",
  },
  PRICOLLTD: {
    sector: "Consumer Cyclical",
    marketCapBucket: "Mid cap",
  },
  TVS: {
    sector: "Consumer Cyclical",
    marketCapBucket: "Large cap",
  },
};

export function lookupTickerSectorOverride(
  ticker: string,
  assetClass: AssetClass = "Equities"
): string | null {
  if (assetClass !== "Equities") return null;
  return FUNDAMENTALS_OVERRIDES[normalizeEquityTicker(ticker)]?.sector ?? null;
}

export function lookupTickerMarketCapBucketOverride(
  ticker: string,
  assetClass: AssetClass = "Equities"
): string | null {
  if (assetClass !== "Equities") return null;
  return (
    FUNDAMENTALS_OVERRIDES[normalizeEquityTicker(ticker)]?.marketCapBucket ?? null
  );
}
