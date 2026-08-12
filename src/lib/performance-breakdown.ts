import { tradeRMultiple } from "@/lib/analytics";
import type { JournalTrade } from "@/lib/journal-types";
import {
  fundamentalsLookupKey,
  type TickerFundamentals,
} from "@/lib/yahoo-fundamentals";
import { lookupTickerSectorOverride, lookupTickerMarketCapBucketOverride } from "@/lib/ticker-sector-overrides";
import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
  type ListingMarketId,
} from "@/lib/equity-listing-markets";
import type { CurrencyCode } from "@/lib/settings";

export type PerformanceBreakdownRow = {
  label: string;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgR: number | null;
};

const MARKET_CAP_ORDER = [
  "Large cap",
  "Mid cap",
  "Small cap",
  "Micro cap",
  "Unknown",
];

function resolveListingMarket(
  trade: JournalTrade,
  currency: CurrencyCode
): ListingMarketId {
  return normalizeListingMarket(
    trade.listingMarket ?? defaultListingMarketForCurrency(currency)
  );
}

function groupLabel(
  trade: JournalTrade,
  fundamentals: Map<string, TickerFundamentals | null>,
  currency: CurrencyCode,
  dimension: "sector" | "marketCap"
): string {
  if (trade.assetClass !== "Equities") {
    return "Non-equity";
  }

  const key = fundamentalsLookupKey(
    trade.ticker,
    trade.assetClass,
    resolveListingMarket(trade, currency)
  );
  const profile = fundamentals.get(key);

  if (dimension === "sector") {
    const override = lookupTickerSectorOverride(trade.ticker, trade.assetClass);
    if (override) return override;
    return profile?.sector?.trim() || "Unknown sector";
  }

  const marketCapOverride = lookupTickerMarketCapBucketOverride(
    trade.ticker,
    trade.assetClass
  );
  if (marketCapOverride) return marketCapOverride;

  return profile?.marketCapBucket ?? "Unknown";
}

export function computePerformanceBreakdown(
  trades: JournalTrade[],
  fundamentals: Record<string, TickerFundamentals | null>,
  currency: CurrencyCode,
  dimension: "sector" | "marketCap"
): PerformanceBreakdownRow[] {
  const map = new Map<string, JournalTrade[]>();
  const fundamentalsMap = new Map(Object.entries(fundamentals));

  for (const trade of trades) {
    const label = groupLabel(trade, fundamentalsMap, currency, dimension);
    const list = map.get(label) ?? [];
    list.push(trade);
    map.set(label, list);
  }

  const rows = Array.from(map.entries()).map(([label, list]) => {
    const wins = list.filter((trade) => trade.pnl > 0);
    const rValues = list
      .map(tradeRMultiple)
      .filter((value): value is number => value !== null);

    return {
      label,
      trades: list.length,
      winRate: list.length ? (wins.length / list.length) * 100 : 0,
      totalPnl:
        Math.round(list.reduce((sum, trade) => sum + trade.pnl, 0) * 100) / 100,
      avgR: rValues.length
        ? Math.round(
            (rValues.reduce((sum, value) => sum + value, 0) / rValues.length) *
              100
          ) / 100
        : null,
    };
  });

  if (dimension === "marketCap") {
    return rows.sort((a, b) => {
      const ai = MARKET_CAP_ORDER.indexOf(a.label);
      const bi = MARKET_CAP_ORDER.indexOf(b.label);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b.totalPnl - a.totalPnl;
    });
  }

  return rows.sort((a, b) => b.totalPnl - a.totalPnl);
}
