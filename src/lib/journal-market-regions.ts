import {
  defaultListingMarketForCurrency,
  EQUITY_LISTING_MARKETS,
  getListingMarket,
  normalizeListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";

export type JournalMarketRegionId =
  | "US"
  | "IN"
  | "UK"
  | "CA"
  | "DE"
  | "FR"
  | "NL"
  | "CH"
  | "HK"
  | "AU"
  | "JP"
  | "KR"
  | "SG"
  | "BR"
  | "MX";

export type JournalMarketRegion = {
  id: JournalMarketRegionId;
  label: string;
  flag: string;
  currency: CurrencyCode;
  listingMarkets: ListingMarketId[];
};

const REGION_LABELS: Record<JournalMarketRegionId, string> = {
  US: "United States",
  IN: "India",
  UK: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  CH: "Switzerland",
  HK: "Hong Kong",
  AU: "Australia",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  BR: "Brazil",
  MX: "Mexico",
};

const REGION_FLAGS: Record<JournalMarketRegionId, string> = {
  US: "🇺🇸",
  IN: "🇮🇳",
  UK: "🇬🇧",
  CA: "🇨🇦",
  DE: "🇩🇪",
  FR: "🇫🇷",
  NL: "🇳🇱",
  CH: "🇨🇭",
  HK: "🇭🇰",
  AU: "🇦🇺",
  JP: "🇯🇵",
  KR: "🇰🇷",
  SG: "🇸🇬",
  BR: "🇧🇷",
  MX: "🇲🇽",
};

const REGION_ORDER: JournalMarketRegionId[] = [
  "US",
  "IN",
  "UK",
  "CA",
  "DE",
  "FR",
  "NL",
  "CH",
  "HK",
  "AU",
  "JP",
  "KR",
  "SG",
  "BR",
  "MX",
];

const REGION_IDS = new Set<string>(REGION_ORDER);

function listingMarketToRegionId(market: ListingMarketId): JournalMarketRegionId {
  if (market === "IN_NSE" || market === "IN_BSE") return "IN";
  return market as JournalMarketRegionId;
}

function buildJournalMarketRegions(): JournalMarketRegion[] {
  const listingMarketsByRegion = new Map<
    JournalMarketRegionId,
    ListingMarketId[]
  >();

  for (const market of EQUITY_LISTING_MARKETS) {
    const regionId = listingMarketToRegionId(market.id);
    const existing = listingMarketsByRegion.get(regionId) ?? [];
    existing.push(market.id);
    listingMarketsByRegion.set(regionId, existing);
  }

  return REGION_ORDER.map((id) => {
    const listingMarkets = listingMarketsByRegion.get(id) ?? [];
    const primaryMarket = listingMarkets[0] ?? "US";
    return {
      id,
      label: REGION_LABELS[id],
      flag: REGION_FLAGS[id],
      currency: getListingMarket(primaryMarket).currency,
      listingMarkets,
    };
  });
}

export const JOURNAL_MARKET_REGIONS = buildJournalMarketRegions();

const REGION_BY_ID = new Map(
  JOURNAL_MARKET_REGIONS.map((region) => [region.id, region])
);

export function isJournalMarketRegionId(
  value: unknown
): value is JournalMarketRegionId {
  return typeof value === "string" && REGION_IDS.has(value);
}

export function getJournalMarketRegion(
  id: JournalMarketRegionId
): JournalMarketRegion {
  return REGION_BY_ID.get(id) ?? JOURNAL_MARKET_REGIONS[0];
}

export function regionIdForListingMarket(
  market: ListingMarketId
): JournalMarketRegionId {
  return listingMarketToRegionId(market);
}

export function regionIdForCurrency(
  currency: CurrencyCode
): JournalMarketRegionId {
  return regionIdForListingMarket(
    defaultListingMarketForCurrency(currency)
  );
}

export function resolveTradeRegionId(
  trade: JournalTrade,
  defaultCurrency: CurrencyCode
): JournalMarketRegionId {
  const market =
    trade.listingMarket != null
      ? normalizeListingMarket(trade.listingMarket)
      : defaultListingMarketForCurrency(defaultCurrency);
  return regionIdForListingMarket(market);
}

export function tradeBelongsToRegion(
  trade: JournalTrade,
  regionId: JournalMarketRegionId,
  defaultCurrency: CurrencyCode
): boolean {
  return resolveTradeRegionId(trade, defaultCurrency) === regionId;
}

export function collectJournalMarketRegions(
  trades: JournalTrade[],
  defaultCurrency: CurrencyCode
): JournalMarketRegion[] {
  const ids = new Set<JournalMarketRegionId>();
  for (const trade of trades) {
    ids.add(resolveTradeRegionId(trade, defaultCurrency));
  }

  if (ids.size === 0) {
    ids.add(regionIdForCurrency(defaultCurrency));
  }

  return JOURNAL_MARKET_REGIONS.filter((region) => ids.has(region.id));
}

export function defaultListingMarketForRegion(
  regionId: JournalMarketRegionId
): ListingMarketId {
  return getJournalMarketRegion(regionId).listingMarkets[0] ?? "US";
}

export function filterTradesByJournalRegion(
  trades: JournalTrade[],
  regionId: JournalMarketRegionId,
  defaultCurrency: CurrencyCode
): JournalTrade[] {
  return trades.filter((trade) =>
    tradeBelongsToRegion(trade, regionId, defaultCurrency)
  );
}
