import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { getScreenerCache } from "@/lib/screener/cache";
import {
  findPrimarySectorLabel,
  getUniqueIndianStocks,
} from "@/lib/screener/indian-sectors";
import {
  chartHasOhlcv,
  detectMomentumSetup,
  MOMENTUM_RULES,
  toWeeklyOhlcv,
  type MomentumSetup,
} from "@/lib/screener/momentum";
import {
  loadYahooSnapshot,
  persistComputedScreenerSnapshot,
  readComputedScreenerSnapshot,
  YAHOO_FETCH_CONCURRENCY,
} from "@/lib/screener/yahoo-store";
import { yahooSymbolForNseTicker } from "@/lib/screener/yahoo-returns";
import { fetchYahooFundamentals } from "@/lib/yahoo-fundamentals";

export const MOMENTUM_SETUPS_CACHE_KEY = "momentum-setups:v2";

const CRORE = 10_000_000;

export type MomentumTimeframe = "either" | "daily" | "weekly";

export type MomentumSetupRow = {
  ticker: string;
  name: string;
  sectorLabel: string | null;
  lastPrice: number | null;
  marketCapCrore: number;
  daily: MomentumSetup | null;
  weekly: MomentumSetup | null;
  why: string;
};

export type MomentumSetupsPayload = {
  setups: MomentumSetupRow[];
  scanned: number;
  asOf: string;
};

function marketCapCrore(
  marketCap: number | null | undefined,
  currency: string | null | undefined
): number | null {
  if (marketCap == null || !Number.isFinite(marketCap) || marketCap <= 0) {
    return null;
  }
  if (currency != null && currency !== "INR") return null;
  return marketCap / CRORE;
}

function describeSetup(label: string, setup: MomentumSetup, unit: string): string {
  const wick = Math.round(setup.upperWickRatio * 100);
  return [
    `${label} close through ₹${setup.resistance.toLocaleString("en-IN")}`,
    `${setup.volumeMultiple.toFixed(1)}× volume`,
    `${wick}% upper wick`,
    `${setup.consolidationBars}-${unit} quieter base`,
  ].join(" · ");
}

function describeWhy(
  daily: MomentumSetup | null,
  weekly: MomentumSetup | null
): string {
  return [
    daily ? describeSetup("Daily", daily, "day") : null,
    weekly ? describeSetup("Weekly", weekly, "week") : null,
  ]
    .filter((part): part is string => part != null)
    .join(" · ");
}

function newestBreakout(row: {
  daily: MomentumSetup | null;
  weekly: MomentumSetup | null;
}): string {
  return [row.daily?.breakoutDate, row.weekly?.breakoutDate]
    .filter((date): date is string => date != null)
    .sort()
    .at(-1) ?? "";
}

export async function loadAllMomentumSetups(
  fresh = false,
  onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<MomentumSetupsPayload> {
  if (!fresh) {
    const cached = getScreenerCache<MomentumSetupsPayload>(
      MOMENTUM_SETUPS_CACHE_KEY
    );
    if (cached) return cached;
    const stored = await readComputedScreenerSnapshot<MomentumSetupsPayload>(
      MOMENTUM_SETUPS_CACHE_KEY
    );
    if (stored) return stored;
  }

  const stocks = getUniqueIndianStocks();
  const total = stocks.length;
  let loaded = 0;
  onProgress?.({ loaded, total });

  const technical = (
    await mapWithConcurrency(stocks, YAHOO_FETCH_CONCURRENCY, async (stock) => {
      try {
        const symbol = yahooSymbolForNseTicker(stock.ticker);
        let snapshot = await loadYahooSnapshot(symbol, fresh);
        if (!chartHasOhlcv(snapshot.chart)) {
          snapshot = await loadYahooSnapshot(symbol, true);
        }
        const daily = detectMomentumSetup(snapshot.chart);
        const weekly = detectMomentumSetup(toWeeklyOhlcv(snapshot.chart));
        if (!daily && !weekly) return null;
        return {
          stock,
          lastPrice: snapshot.lastPrice,
          daily,
          weekly,
        };
      } finally {
        loaded += 1;
        onProgress?.({ loaded, total });
      }
    })
  ).flatMap((row) => (row ? [row] : []));

  const qualified = (
    await mapWithConcurrency(technical, 4, async (row) => {
      let fundamentals: Awaited<ReturnType<typeof fetchYahooFundamentals>> =
        null;
      try {
        fundamentals = await fetchYahooFundamentals({
          ticker: row.stock.ticker,
          assetClass: "Equities",
          listingMarket: "IN_NSE",
        });
      } catch {
        return null;
      }
      const crore = marketCapCrore(
        fundamentals?.marketCap,
        fundamentals?.currency
      );
      if (crore == null || crore < MOMENTUM_RULES.minMarketCapCrore) return null;
      const setupRow: MomentumSetupRow = {
        ticker: row.stock.ticker,
        name: row.stock.name,
        sectorLabel: findPrimarySectorLabel(row.stock.ticker),
        lastPrice: row.lastPrice,
        marketCapCrore: Math.round(crore),
        daily: row.daily,
        weekly: row.weekly,
        why: describeWhy(row.daily, row.weekly),
      };
      return setupRow;
    })
  )
    .flatMap((row) => (row ? [row] : []))
    .sort((left, right) =>
      newestBreakout(right).localeCompare(newestBreakout(left))
    );

  const payload: MomentumSetupsPayload = {
    setups: qualified,
    scanned: stocks.length,
    asOf: new Date().toISOString(),
  };
  await persistComputedScreenerSnapshot(MOMENTUM_SETUPS_CACHE_KEY, payload);
  return payload;
}
