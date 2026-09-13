import { getScreenerCache } from "@/lib/screener/cache";
import {
  refreshStrategyCaches,
  TURTLE_BREAKOUTS_CACHE_KEY,
} from "@/lib/screener/load-strategy-scans";
import {
  matchesTurtleSystem,
  type TurtleSystem,
} from "@/lib/screener/turtle-rules";
import { readComputedScreenerSnapshot } from "@/lib/screener/yahoo-store";

export type TurtleBreakoutRow = {
  ticker: string;
  name: string;
  sectorLabel: string | null;
  lastPrice: number | null;
  system: "S1" | "S2" | "W20";
  channelHigh: number | null;
  extension: number | null;
  ageBars: number | null;
  why: string;
};

export type TurtleBreakoutsPayload = {
  setups: TurtleBreakoutRow[];
  scanned: number;
  asOf: string;
  system: TurtleSystem;
};

function filterPayload(
  payload: TurtleBreakoutsPayload,
  system: TurtleSystem
): TurtleBreakoutsPayload {
  return {
    ...payload,
    system,
    setups: payload.setups.filter((row) =>
      matchesTurtleSystem(system, row.system)
    ),
  };
}

export async function loadAllTurtleBreakouts(
  fresh = false
): Promise<TurtleBreakoutsPayload> {
  if (!fresh) {
    const cached = getScreenerCache<TurtleBreakoutsPayload>(
      TURTLE_BREAKOUTS_CACHE_KEY
    );
    if (cached) return cached;
    const stored = await readComputedScreenerSnapshot<TurtleBreakoutsPayload>(
      TURTLE_BREAKOUTS_CACHE_KEY
    );
    if (stored) return stored;
  }

  await refreshStrategyCaches(fresh);
  return (
    getScreenerCache<TurtleBreakoutsPayload>(TURTLE_BREAKOUTS_CACHE_KEY) ?? {
      setups: [],
      scanned: 0,
      asOf: new Date().toISOString(),
      system: "any",
    }
  );
}

export async function loadTurtleBreakouts(
  system: TurtleSystem = "any",
  fresh = false
): Promise<TurtleBreakoutsPayload> {
  return filterPayload(await loadAllTurtleBreakouts(fresh), system);
}
