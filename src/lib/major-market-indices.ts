import type { ListingMarketId } from "@/lib/equity-listing-markets";
import {
  isListingMarketOpen,
  msUntilNextSessionBoundaryForSymbols,
} from "@/lib/listing-market-hours";
import type { CurrencyCode } from "@/lib/settings";

export type MajorMarketIndex = {
  id: string;
  region: string;
  label: string;
  yahooSymbol: string;
  /** Preferred display currency when Yahoo omits it. */
  currency: CurrencyCode | "JPY" | "KRW" | "CNY" | "HKD" | "AUD" | "BRL" | "SGD";
  listingMarket: ListingMarketId;
};

export type MarketIndexQuote = {
  price: number;
  changePercent: number | null;
  currency: string;
  formattedPrice: string;
  isLive: boolean;
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
    formatted: {
      open: string;
      high: string;
      low: string;
      close: string;
    };
  } | null;
};

/** Benchmark indices / ETFs for major equity markets (Yahoo Finance symbols). */
export const MAJOR_MARKET_INDICES: MajorMarketIndex[] = [
  {
    id: "nifty50",
    region: "India",
    label: "Nifty 50",
    yahooSymbol: "^NSEI",
    currency: "INR",
    listingMarket: "IN_NSE",
  },
  {
    id: "spy",
    region: "USA",
    label: "SPY",
    yahooSymbol: "SPY",
    currency: "USD",
    listingMarket: "US",
  },
  {
    id: "shanghai",
    region: "China",
    label: "SSE Composite",
    yahooSymbol: "000001.SS",
    currency: "CNY",
    listingMarket: "HK",
  },
  {
    id: "kospi",
    region: "Korea",
    label: "KOSPI",
    yahooSymbol: "^KS11",
    currency: "KRW",
    listingMarket: "KR",
  },
  {
    id: "nikkei",
    region: "Japan",
    label: "Nikkei 225",
    yahooSymbol: "^N225",
    currency: "JPY",
    listingMarket: "JP",
  },
  {
    id: "ftse",
    region: "UK",
    label: "FTSE 100",
    yahooSymbol: "^FTSE",
    currency: "GBP",
    listingMarket: "UK",
  },
  {
    id: "dax",
    region: "Germany",
    label: "DAX",
    yahooSymbol: "^GDAXI",
    currency: "EUR",
    listingMarket: "DE",
  },
  {
    id: "cac",
    region: "France",
    label: "CAC 40",
    yahooSymbol: "^FCHI",
    currency: "EUR",
    listingMarket: "FR",
  },
  {
    id: "hsi",
    region: "Hong Kong",
    label: "Hang Seng",
    yahooSymbol: "^HSI",
    currency: "HKD",
    listingMarket: "HK",
  },
  {
    id: "asx",
    region: "Australia",
    label: "ASX 200",
    yahooSymbol: "^AXJO",
    currency: "AUD",
    listingMarket: "AU",
  },
  {
    id: "bovespa",
    region: "Brazil",
    label: "Bovespa",
    yahooSymbol: "^BVSP",
    currency: "BRL",
    listingMarket: "BR",
  },
  {
    id: "sti",
    region: "Singapore",
    label: "STI",
    yahooSymbol: "^STI",
    currency: "SGD",
    listingMarket: "SG",
  },
];

const SUPPORTED_CURRENCIES = new Set<CurrencyCode>([
  "USD",
  "EUR",
  "GBP",
  "INR",
  "CAD",
]);

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: "¥",
  KRW: "₩",
  CNY: "¥",
  HKD: "HK$",
  AUD: "A$",
  BRL: "R$",
  SGD: "S$",
};

export function formatIndexPrice(
  value: number,
  currency: string
): string {
  if (SUPPORTED_CURRENCIES.has(currency as CurrencyCode)) {
    const locale = currency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  const symbol = CURRENCY_SYMBOLS[currency] ?? "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return symbol ? `${symbol}${formatted}` : formatted;
}

/** Sidebar-friendly price: fewer decimals on large index levels. */
export function formatIndexPriceCompact(
  value: number,
  currency: string
): string {
  const decimals = value >= 1000 ? 0 : 2;

  if (SUPPORTED_CURRENCIES.has(currency as CurrencyCode)) {
    const locale = currency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  const symbol = CURRENCY_SYMBOLS[currency] ?? "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return symbol ? `${symbol}${formatted}` : formatted;
}

/** Absolute move vs prior close from live price and % change. */
export function computeIndexPriceChange(
  price: number,
  changePercent: number | null
): number | null {
  if (changePercent == null || !Number.isFinite(changePercent)) return null;
  const change = (price * changePercent) / (100 + changePercent);
  if (!Number.isFinite(change)) return null;
  return Math.round(change * 100) / 100;
}

/** Signed currency formatting for index point change. */
export function formatIndexPriceChange(
  value: number,
  currency: string
): string {
  const formatted = formatIndexPrice(value, currency);
  return value > 0 ? `+${formatted}` : formatted;
}

export function anyMajorIndexMarketOpen(now = new Date()): boolean {
  return MAJOR_MARKET_INDICES.some((index) =>
    isListingMarketOpen(index.listingMarket, now)
  );
}

export function majorMarketIndicesPollIntervalMs(now = new Date()): number {
  if (anyMajorIndexMarketOpen(now)) return 2_000;

  const boundaryMs = msUntilNextSessionBoundaryForSymbols(
    MAJOR_MARKET_INDICES.map((index) => ({
      assetClass: "Equities" as const,
      listingMarket: index.listingMarket,
    })),
    now
  );

  if (boundaryMs != null && boundaryMs <= 15 * 60_000) {
    return Math.min(5_000, Math.max(1_000, boundaryMs));
  }

  return 60_000;
}
