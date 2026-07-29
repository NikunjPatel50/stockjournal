import type { EquityExchangeHint } from "@/lib/eodhd";
import type { CurrencyCode } from "@/lib/settings";

export const EQUITY_LISTING_MARKETS = [
  {
    id: "US",
    label: "United States — NYSE / NASDAQ",
    yahooSuffix: "",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "USD" satisfies CurrencyCode,
  },
  {
    id: "IN_NSE",
    label: "India — NSE",
    yahooSuffix: ".NS",
    eodhdExchange: "NSE" satisfies EquityExchangeHint,
    currency: "INR" satisfies CurrencyCode,
  },
  {
    id: "IN_BSE",
    label: "India — BSE",
    yahooSuffix: ".BO",
    eodhdExchange: "NSE" satisfies EquityExchangeHint,
    currency: "INR" satisfies CurrencyCode,
  },
  {
    id: "UK",
    label: "United Kingdom — LSE",
    yahooSuffix: ".L",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "GBP" satisfies CurrencyCode,
  },
  {
    id: "CA",
    label: "Canada — TSX",
    yahooSuffix: ".TO",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "CAD" satisfies CurrencyCode,
  },
  {
    id: "DE",
    label: "Germany — XETRA",
    yahooSuffix: ".DE",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "EUR" satisfies CurrencyCode,
  },
  {
    id: "FR",
    label: "France — Euronext Paris",
    yahooSuffix: ".PA",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "EUR" satisfies CurrencyCode,
  },
  {
    id: "NL",
    label: "Netherlands — Euronext Amsterdam",
    yahooSuffix: ".AS",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "EUR" satisfies CurrencyCode,
  },
  {
    id: "CH",
    label: "Switzerland — SIX",
    yahooSuffix: ".SW",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "EUR" satisfies CurrencyCode,
  },
  {
    id: "HK",
    label: "Hong Kong",
    yahooSuffix: ".HK",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "USD" satisfies CurrencyCode,
  },
  {
    id: "AU",
    label: "Australia — ASX",
    yahooSuffix: ".AX",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "USD" satisfies CurrencyCode,
  },
  {
    id: "JP",
    label: "Japan — Tokyo",
    yahooSuffix: ".T",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "USD" satisfies CurrencyCode,
  },
  {
    id: "KR",
    label: "South Korea — KRX",
    yahooSuffix: ".KS",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "USD" satisfies CurrencyCode,
  },
  {
    id: "SG",
    label: "Singapore — SGX",
    yahooSuffix: ".SI",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "USD" satisfies CurrencyCode,
  },
  {
    id: "BR",
    label: "Brazil — B3",
    yahooSuffix: ".SA",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "USD" satisfies CurrencyCode,
  },
  {
    id: "MX",
    label: "Mexico — BMV",
    yahooSuffix: ".MX",
    eodhdExchange: "US" satisfies EquityExchangeHint,
    currency: "USD" satisfies CurrencyCode,
  },
] as const;

export type ListingMarketId = (typeof EQUITY_LISTING_MARKETS)[number]["id"];

const MARKET_IDS = new Set<string>(EQUITY_LISTING_MARKETS.map((m) => m.id));

export const LISTING_MARKET_IDS = EQUITY_LISTING_MARKETS.map(
  (m) => m.id
) as [ListingMarketId, ...ListingMarketId[]];

export function getListingMarket(id: ListingMarketId) {
  const market = EQUITY_LISTING_MARKETS.find((m) => m.id === id);
  return market ?? EQUITY_LISTING_MARKETS[0];
}

export function defaultListingMarketForCurrency(
  currency: CurrencyCode
): ListingMarketId {
  if (currency === "INR") return "IN_NSE";
  if (currency === "GBP") return "UK";
  if (currency === "CAD") return "CA";
  if (currency === "EUR") return "DE";
  return "US";
}

export function normalizeListingMarket(value: unknown): ListingMarketId {
  if (typeof value === "string" && MARKET_IDS.has(value)) {
    return value as ListingMarketId;
  }
  return "US";
}

export function yahooSymbolForListingMarket(
  ticker: string,
  marketId: ListingMarketId
): string {
  const base = ticker.trim().toUpperCase().replace(/^\$/, "");
  if (!base) return "";
  if (base.includes(".")) return base;
  const suffix = getListingMarket(marketId).yahooSuffix;
  return `${base}${suffix}`;
}
