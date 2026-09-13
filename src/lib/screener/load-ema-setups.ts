import { getScreenerCache } from "@/lib/screener/cache";
import { passesEmaTimeframe, type EmaTimeframe } from "@/lib/screener/ema-rules";
import {
  EMA_SETUPS_CACHE_KEY,
  refreshStrategyCaches,
} from "@/lib/screener/load-strategy-scans";
import { readComputedScreenerSnapshot } from "@/lib/screener/yahoo-store";

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
  why: string;
};

export type EmaSetupsPayload = {
  setups: EmaSetupRow[];
  scanned: number;
  asOf: string;
  timeframe: EmaTimeframe;
};

function filterPayload(
  payload: EmaSetupsPayload,
  timeframe: EmaTimeframe
): EmaSetupsPayload {
  return {
    ...payload,
    timeframe,
    setups: payload.setups.filter((row) =>
      passesEmaTimeframe(timeframe, row.daily.holding, row.weekly.holding)
    ),
  };
}

export async function loadAllEmaSetups(
  fresh = false
): Promise<EmaSetupsPayload> {
  if (!fresh) {
    const cached = getScreenerCache<EmaSetupsPayload>(EMA_SETUPS_CACHE_KEY);
    if (cached) return cached;
    const stored = await readComputedScreenerSnapshot<EmaSetupsPayload>(
      EMA_SETUPS_CACHE_KEY
    );
    if (stored) return stored;
  }

  await refreshStrategyCaches(fresh);
  return (
    getScreenerCache<EmaSetupsPayload>(EMA_SETUPS_CACHE_KEY) ?? {
      setups: [],
      scanned: 0,
      asOf: new Date().toISOString(),
      timeframe: "both",
    }
  );
}

export async function loadEmaSetups(
  timeframe: EmaTimeframe = "both",
  fresh = false
): Promise<EmaSetupsPayload> {
  return filterPayload(await loadAllEmaSetups(fresh), timeframe);
}
