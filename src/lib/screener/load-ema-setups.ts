import { yahooSymbolForListingMarket } from "@/lib/equity-listing-markets";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { isListingMarketOpen } from "@/lib/listing-market-hours";
import { getScreenerCache } from "@/lib/screener/cache";
import type { TradePlan } from "@/lib/screener/trade-plan";
import { passesEmaTimeframe, type EmaTimeframe } from "@/lib/screener/ema-rules";
import { loadIndianListedUniverse } from "@/lib/screener/large-cap-universe";
import {
  buildEmaSetupsFromSnapshots,
  dedupeEmaSetupsByTicker,
  EMA_SETUPS_CACHE_KEY,
} from "@/lib/screener/load-strategy-scans";
import {
  loadYahooSnapshot,
  persistComputedScreenerSnapshot,
  readComputedScreenerSnapshot,
  YAHOO_FETCH_CONCURRENCY,
} from "@/lib/screener/yahoo-store";

export type EmaSetupRow = {
  ticker: string;
  name: string;
  sectorLabel: string | null;
  lastPrice: number | null;
  daily: {
    ema50: number | null;
    ema200: number | null;
    dist50: number | null;
    dist200: number | null;
    holding: boolean;
  };
  weekly: {
    ema50: number | null;
    ema200: number | null;
    dist50: number | null;
    dist200: number | null;
    holding: boolean;
  };
  tradeDaily: TradePlan | null;
  tradeWeekly: TradePlan | null;
  why: string;
};

export type EmaSetupsPayload = {
  setups: EmaSetupRow[];
  scanned: number;
  asOf: string;
  timeframe: EmaTimeframe;
};

function normalizeEmaPayload(payload: EmaSetupsPayload): EmaSetupsPayload {
  return {
    ...payload,
    setups: dedupeEmaSetupsByTicker(payload.setups),
  };
}

function filterPayload(
  payload: EmaSetupsPayload,
  timeframe: EmaTimeframe
): EmaSetupsPayload {
  return normalizeEmaPayload({
    ...payload,
    timeframe,
    setups: payload.setups.filter((row) =>
      passesEmaTimeframe(timeframe, row.daily.holding, row.weekly.holding)
    ),
  });
}

let emaInflight: Promise<EmaSetupsPayload> | null = null;

async function scanIndianLargeCapEmaSetups(
  fresh: boolean,
  onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<EmaSetupsPayload> {
  const stocks = await loadIndianListedUniverse();
  if (stocks.length === 0) {
    throw new Error("Could not load the NSE and BSE stock lists.");
  }

  const total = stocks.length;
  let loaded = 0;
  const liveCharts = fresh || isListingMarketOpen("IN_NSE");
  onProgress?.({ loaded, total });

  const snapshots = await mapWithConcurrency(
    stocks,
    YAHOO_FETCH_CONCURRENCY,
    async (stock) => {
      try {
        const symbol = yahooSymbolForListingMarket(
          stock.ticker,
          stock.listingMarket
        );
        const snapshot = await loadYahooSnapshot(symbol, liveCharts, {
          skipStore: true,
        });
        return {
          stock: { ticker: stock.ticker, name: stock.name },
          snapshot,
        };
      } finally {
        loaded += 1;
        onProgress?.({ loaded, total });
      }
    }
  );

  const payload = buildEmaSetupsFromSnapshots(snapshots);
  await persistComputedScreenerSnapshot(EMA_SETUPS_CACHE_KEY, payload);
  return normalizeEmaPayload(payload);
}

export async function loadAllEmaSetups(
  fresh = false,
  onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<EmaSetupsPayload> {
  if (!fresh) {
    const cached = getScreenerCache<EmaSetupsPayload>(EMA_SETUPS_CACHE_KEY);
    if (cached) return normalizeEmaPayload(cached);
    const stored = await readComputedScreenerSnapshot<EmaSetupsPayload>(
      EMA_SETUPS_CACHE_KEY
    );
    if (stored) return normalizeEmaPayload(stored);
  }

  if (emaInflight) return emaInflight;

  const pending = scanIndianLargeCapEmaSetups(fresh, onProgress);
  emaInflight = pending;
  try {
    return await pending;
  } finally {
    if (emaInflight === pending) emaInflight = null;
  }
}

export async function loadEmaSetups(
  timeframe: EmaTimeframe = "both",
  fresh = false
): Promise<EmaSetupsPayload> {
  return filterPayload(await loadAllEmaSetups(fresh), timeframe);
}
