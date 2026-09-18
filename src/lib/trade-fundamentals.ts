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
  isKnownMarketCapBucket,
  isUsableFundamentals,
  resolvedMarketCapBucket,
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

function listingCurrencyForTrade(
  trade: JournalTrade,
  fallback: CurrencyCode
): CurrencyCode {
  const listingMarket = trade.listingMarket;
  if (listingMarket === "IN_NSE" || listingMarket === "IN_BSE") return "INR";
  return fallback;
}

export function tradeNeedsFundamentalsBackfill(trade: JournalTrade): boolean {
  if (trade.assetClass !== "Equities") return false;
  return !trade.sector?.trim() || !isKnownMarketCapBucket(trade.marketCapBucket);
}

export function mergeFundamentalsIntoTrade(
  trade: JournalTrade,
  profile: TickerFundamentals | null,
  currency: CurrencyCode = "USD"
): JournalTrade {
  if (trade.assetClass !== "Equities") return trade;

  const sectorOverride = lookupTickerSectorOverride(trade.ticker, trade.assetClass);
  const marketCapOverride = lookupTickerMarketCapBucketOverride(
    trade.ticker,
    trade.assetClass
  );

  const currentSector = trade.sector?.trim() || undefined;
  const currentBucket = isKnownMarketCapBucket(trade.marketCapBucket)
    ? trade.marketCapBucket!.trim()
    : undefined;

  const resolvedSector =
    sectorOverride ?? profile?.sector?.trim() ?? null;
  const resolvedBucket =
    marketCapOverride ??
    resolvedMarketCapBucket(
      profile?.marketCapBucket,
      profile?.marketCap,
      profile?.currency ?? listingCurrencyForTrade(trade, currency)
    );

  const nextSector = currentSector || resolvedSector || undefined;
  const nextBucket = currentBucket || resolvedBucket || undefined;

  const next: JournalTrade = { ...trade };
  if (nextSector) next.sector = nextSector;
  if (nextBucket) {
    next.marketCapBucket = nextBucket;
  } else {
    delete next.marketCapBucket;
  }

  if (
    next.sector === trade.sector &&
    next.marketCapBucket === trade.marketCapBucket
  ) {
    return trade;
  }

  return next;
}

/** Persist sector / market-cap snapshots on trades once fundamentals resolve. */
export function backfillTradeFundamentals(
  trades: JournalTrade[],
  fundamentals: Record<string, TickerFundamentals | null>,
  currency: CurrencyCode
): JournalTrade[] {
  let changed = false;

  const next = trades.map((trade) => {
    if (!tradeNeedsFundamentalsBackfill(trade)) return trade;

    const key = resolveTradeFundamentalsKey(trade, currency);
    const profile = fundamentals[key] ?? null;
    const merged = mergeFundamentalsIntoTrade(trade, profile, currency);
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
  if (!tradeNeedsFundamentalsBackfill(trade)) return;

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
      const merged = mergeFundamentalsIntoTrade(prev[index], profile, currency);
      if (merged === prev[index]) return prev;
      const next = [...prev];
      next[index] = merged;
      return next;
    });
  } catch {
    // Best-effort enrichment; analytics will retry later.
  }
}
