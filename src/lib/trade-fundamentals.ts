import {
  defaultListingMarketForCurrency,
  normalizeListingMarket,
} from "@/lib/equity-listing-markets";
import type { JournalTrade } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import {
  lookupTickerMarketCapBucketOverride,
  lookupTickerSectorOverride,
} from "@/lib/ticker-sector-overrides";
import {
  fundamentalsLookupKey,
  isUsableFundamentals,
  type TickerFundamentals,
} from "@/lib/yahoo-fundamentals";
import { writeFundamentalsCache } from "@/lib/fundamentals-cache";

export function resolveTradeFundamentalsKey(
  trade: JournalTrade,
  currency: CurrencyCode
): string {
  return fundamentalsLookupKey(
    trade.ticker,
    trade.assetClass,
    normalizeListingMarket(
      trade.listingMarket ?? defaultListingMarketForCurrency(currency)
    )
  );
}

export function mergeFundamentalsIntoTrade(
  trade: JournalTrade,
  profile: TickerFundamentals | null
): JournalTrade {
  if (trade.assetClass !== "Equities") return trade;

  const sectorOverride = lookupTickerSectorOverride(trade.ticker, trade.assetClass);
  const marketCapOverride = lookupTickerMarketCapBucketOverride(
    trade.ticker,
    trade.assetClass
  );

  const resolvedSector =
    sectorOverride ?? profile?.sector?.trim() ?? null;
  const resolvedBucket =
    marketCapOverride ??
    (profile?.marketCapBucket && profile.marketCapBucket !== "Unknown"
      ? profile.marketCapBucket
      : null);

  const nextSector = trade.sector?.trim() || resolvedSector || undefined;
  const nextBucket =
    trade.marketCapBucket?.trim() || resolvedBucket || undefined;

  if (
    nextSector === trade.sector &&
    nextBucket === trade.marketCapBucket
  ) {
    return trade;
  }

  return {
    ...trade,
    ...(nextSector ? { sector: nextSector } : {}),
    ...(nextBucket ? { marketCapBucket: nextBucket } : {}),
  };
}

/** Persist sector / market-cap snapshots on trades once fundamentals resolve. */
export function backfillTradeFundamentals(
  trades: JournalTrade[],
  fundamentals: Record<string, TickerFundamentals | null>,
  currency: CurrencyCode
): JournalTrade[] {
  let changed = false;

  const next = trades.map((trade) => {
    if (trade.assetClass !== "Equities") return trade;
    if (trade.sector && trade.marketCapBucket) return trade;

    const key = resolveTradeFundamentalsKey(trade, currency);
    const profile = fundamentals[key] ?? null;
    if (!isUsableFundamentals(profile)) return trade;

    const merged = mergeFundamentalsIntoTrade(trade, profile);
    if (merged !== trade) changed = true;
    return merged;
  });

  return changed ? next : trades;
}

export async function enrichSavedTradeFundamentals(
  trade: JournalTrade,
  currency: CurrencyCode,
  setTrades: (updater: (prev: JournalTrade[]) => JournalTrade[]) => void
): Promise<void> {
  if (trade.assetClass !== "Equities") return;
  if (trade.sector && trade.marketCapBucket) return;

  const listingMarket = normalizeListingMarket(
    trade.listingMarket ?? defaultListingMarketForCurrency(currency)
  );

  try {
    const res = await fetch("/api/market-data/fundamentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: [
          {
            ticker: trade.ticker,
            assetClass: trade.assetClass,
            listingMarket,
          },
        ],
      }),
    });

    const data = (await res.json()) as {
      fundamentals?: Record<string, TickerFundamentals | null>;
    };
    if (!res.ok) return;

    const key = fundamentalsLookupKey(
      trade.ticker,
      trade.assetClass,
      listingMarket
    );
    const profile = data.fundamentals?.[key] ?? null;
    if (!isUsableFundamentals(profile)) return;

    writeFundamentalsCache({ [key]: profile });

    setTrades((prev) => {
      const index = prev.findIndex((row) => row.id === trade.id);
      if (index === -1) return prev;
      const merged = mergeFundamentalsIntoTrade(prev[index], profile);
      if (merged === prev[index]) return prev;
      const next = [...prev];
      next[index] = merged;
      return next;
    });
  } catch {
    // Best-effort enrichment; analytics will retry later.
  }
}
