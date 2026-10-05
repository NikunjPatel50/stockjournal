import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { isListingMarketOpen } from "@/lib/listing-market-hours";
import {
  getScreenerCache,
  screenerCacheTtlMs,
  setScreenerCache,
} from "@/lib/screener/cache";
import { findPrimarySectorLabel } from "@/lib/screener/indian-sectors";
import { loadNseLargeCapUniverse } from "@/lib/screener/large-cap-universe";
import {
  chartHasOhlcv,
  detectMomentumSetup,
  toWeeklyOhlcv,
  type MomentumSetup,
} from "@/lib/screener/momentum";
import { buildTradePlan, type TradePlan } from "@/lib/screener/trade-plan";
import type { ScreenerChartPoint } from "@/lib/screener/types";
import { getNseScreenerSessionDate } from "@/lib/screener/session";
import {
  readScreenerSnapshot,
  writeScreenerSnapshot,
} from "@/lib/screener/snapshot-store";
import {
  loadYahooSnapshot,
  YAHOO_FETCH_CONCURRENCY,
} from "@/lib/screener/yahoo-store";
import { yahooSymbolForNseTicker } from "@/lib/screener/yahoo-returns";

export const MOMENTUM_SETUPS_CACHE_KEY = "momentum-setups:v5";

export type MomentumTimeframe = "either" | "daily" | "weekly";

export type MomentumSetupRow = {
  ticker: string;
  name: string;
  sectorLabel: string | null;
  lastPrice: number | null;
  marketCapCrore: number;
  daily: MomentumSetup | null;
  weekly: MomentumSetup | null;
  tradeDaily: TradePlan | null;
  tradeWeekly: TradePlan | null;
  why: string;
};

export type MomentumSetupsPayload = {
  setups: MomentumSetupRow[];
  scanned: number;
  asOf: string;
};

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

function momentumPlan(
  chart: ScreenerChartPoint[],
  setup: MomentumSetup | null,
  price: number,
  frame: "Daily" | "Weekly"
): TradePlan | null {
  if (!setup || price <= 0) return null;
  return buildTradePlan(chart, {
    kind: "momentum",
    frame,
    price,
    level: setup.resistance,
    trigger: setup.baseHigh,
    invalidation: setup.baseLow,
  });
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

async function rememberMomentumPayload(payload: MomentumSetupsPayload) {
  const marketOpen = isListingMarketOpen("IN_NSE");
  setScreenerCache(
    MOMENTUM_SETUPS_CACHE_KEY,
    payload,
    screenerCacheTtlMs(marketOpen)
  );
  if (marketOpen) return;
  await writeScreenerSnapshot(
    MOMENTUM_SETUPS_CACHE_KEY,
    getNseScreenerSessionDate(),
    payload
  );
}

export async function loadAllMomentumSetups(
  fresh = false,
  onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<MomentumSetupsPayload> {
  const marketOpen = isListingMarketOpen("IN_NSE");
  if (!fresh) {
    const cached = getScreenerCache<MomentumSetupsPayload>(
      MOMENTUM_SETUPS_CACHE_KEY
    );
    if (cached) return cached;
    if (!marketOpen) {
      const stored = await readScreenerSnapshot<MomentumSetupsPayload>(
        MOMENTUM_SETUPS_CACHE_KEY
      );
      if (stored) {
        setScreenerCache(
          MOMENTUM_SETUPS_CACHE_KEY,
          stored.payload,
          screenerCacheTtlMs(false)
        );
        return stored.payload;
      }
    }
  }

  const stocks = await loadNseLargeCapUniverse();
  if (stocks.length === 0) {
    throw new Error("Could not load NSE stocks above ₹10,000 Cr.");
  }

  const total = stocks.length;
  let loaded = 0;
  const liveCharts = fresh || marketOpen;
  onProgress?.({ loaded, total });

  const setups = (
    await mapWithConcurrency(stocks, YAHOO_FETCH_CONCURRENCY, async (stock) => {
      try {
        const symbol = yahooSymbolForNseTicker(stock.ticker);
        let snapshot = await loadYahooSnapshot(symbol, liveCharts);
        if (!chartHasOhlcv(snapshot.chart)) {
          snapshot = await loadYahooSnapshot(symbol, true);
        }
        const daily = detectMomentumSetup(snapshot.chart);
        const weeklyBars = toWeeklyOhlcv(snapshot.chart);
        const weekly = detectMomentumSetup(weeklyBars);
        if (!daily && !weekly) return null;
        const price =
          snapshot.lastPrice ??
          snapshot.chart[snapshot.chart.length - 1]?.close ??
          0;
        const setupRow: MomentumSetupRow = {
          ticker: stock.ticker,
          name: stock.name,
          sectorLabel: findPrimarySectorLabel(stock.ticker),
          lastPrice: snapshot.lastPrice,
          marketCapCrore: stock.marketCapCrore,
          daily,
          weekly,
          tradeDaily: momentumPlan(snapshot.chart, daily, price, "Daily"),
          tradeWeekly: momentumPlan(weeklyBars, weekly, price, "Weekly"),
          why: describeWhy(daily, weekly),
        };
        return setupRow;
      } finally {
        loaded += 1;
        onProgress?.({ loaded, total });
      }
    })
  )
    .flatMap((row) => (row ? [row] : []))
    .sort((left, right) =>
      newestBreakout(right).localeCompare(newestBreakout(left))
    );

  const payload: MomentumSetupsPayload = {
    setups,
    scanned: stocks.length,
    asOf: new Date().toISOString(),
  };
  await rememberMomentumPayload(payload);
  return payload;
}
