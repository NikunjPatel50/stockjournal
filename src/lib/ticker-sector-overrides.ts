import type { AssetClass } from "@/lib/journal-types";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";

/** Manual sector labels when Yahoo fundamentals are missing or unreliable. */
const SECTOR_BY_TICKER: Record<string, string> = {
  ARTEMISMED: "Healthcare",
};

export function lookupTickerSectorOverride(
  ticker: string,
  assetClass: AssetClass = "Equities"
): string | null {
  if (assetClass !== "Equities") return null;
  return SECTOR_BY_TICKER[normalizeEquityTicker(ticker)] ?? null;
}
