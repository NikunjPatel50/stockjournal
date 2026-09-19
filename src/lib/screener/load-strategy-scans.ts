import { getScreenerCache } from "@/lib/screener/cache";
import { computeEmaSupport, toWeeklyCloses } from "@/lib/screener/ema";
import { EMA_QUALITY_RULES } from "@/lib/screener/ema-rules";
import { findPrimarySectorLabel } from "@/lib/screener/indian-sectors";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import type { EmaSetupRow, EmaSetupsPayload } from "@/lib/screener/load-ema-setups";
import type {
  TurtleBreakoutRow,
  TurtleBreakoutsPayload,
} from "@/lib/screener/load-turtle-breakouts";
import { detectTurtleBreakout, toWeeklyTurtleBars } from "@/lib/screener/turtle";
import { TURTLE_LOOKBACKS } from "@/lib/screener/turtle-rules";
import {
  loadUniverseSnapshots,
  persistComputedScreenerSnapshot,
  type UniverseSnapshot,
} from "@/lib/screener/yahoo-store";

export const EMA_SETUPS_CACHE_KEY = "ema-setups:ema200-5";
export const TURTLE_BREAKOUTS_CACHE_KEY = "turtle-breakouts:tech";

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function emaNearestDist200(row: EmaSetupRow): number {
  return Math.min(
    row.daily.holding ? (row.daily.dist200 ?? 99) : 99,
    row.weekly.holding ? (row.weekly.dist200 ?? 99) : 99
  );
}

export function dedupeEmaSetupsByTicker(setups: EmaSetupRow[]): EmaSetupRow[] {
  const byTicker = new Map<string, EmaSetupRow>();

  for (const row of setups) {
    const key = normalizeEquityTicker(row.ticker);
    const existing = byTicker.get(key);
    if (!existing || emaNearestDist200(row) < emaNearestDist200(existing)) {
      byTicker.set(key, row);
    }
  }

  return Array.from(byTicker.values());
}

function describeEmaWhy(row: EmaSetupRow): string {
  const parts: string[] = [];
  if (row.daily.holding && row.weekly.holding) {
    parts.push("Daily and weekly 200 EMA support");
  } else if (row.daily.holding) {
    parts.push("Daily 200 EMA support");
  } else if (row.weekly.holding) {
    parts.push("Weekly 200 EMA support");
  }

  if (row.daily.holding && row.daily.dist200 != null) {
    parts.push(`Daily 200 EMA +${formatPct(row.daily.dist200)}`);
  }
  if (row.weekly.holding && row.weekly.dist200 != null) {
    parts.push(`Weekly 200 EMA +${formatPct(row.weekly.dist200)}`);
  }

  return parts.slice(0, 3).join(" · ");
}

function describeTurtleWhy(row: TurtleBreakoutRow): string {
  const parts: string[] = [];
  if (row.system === "S1") parts.push("20-day Donchian breakout");
  if (row.system === "S2") parts.push("55-day Donchian breakout");
  if (row.system === "W20") parts.push("20-week Donchian breakout");
  if (row.extension != null) {
    parts.push(`Above channel ${formatPct(row.extension)}`);
  }
  if (row.system === "W20") {
    if (row.ageBars === 0) parts.push("Breaking this week");
    if (row.ageBars === 1) parts.push("Broke last week");
  } else {
    if (row.ageBars === 0) parts.push("Breaking now");
    if (row.ageBars === 1) parts.push("Broke yesterday");
    if (row.ageBars != null && row.ageBars >= 2) parts.push("Broke 2 days ago");
  }
  return parts.slice(0, 3).join(" · ");
}

export function buildEmaSetupsFromSnapshots(
  snapshots: UniverseSnapshot[]
): EmaSetupsPayload {
  const setups = snapshots
    .flatMap(({ stock, snapshot }) => {
      const closes = snapshot.chart.map((point) => point.close);
      const price = snapshot.lastPrice ?? closes[closes.length - 1] ?? null;
      if (price == null || closes.length < 200) return [];

      const daily = computeEmaSupport(closes, price, EMA_QUALITY_RULES.ema200Band);
      const weekly = computeEmaSupport(
        toWeeklyCloses(snapshot.chart),
        price,
        EMA_QUALITY_RULES.ema200Band
      );
      if (!daily.holding && !weekly.holding) return [];

      const row: EmaSetupRow = {
        ticker: stock.ticker,
        name: stock.name,
        sectorLabel: findPrimarySectorLabel(stock.ticker),
        lastPrice: price,
        daily: {
          ema50: daily.ema50,
          ema200: daily.ema200,
          dist50: daily.dist50,
          dist200: daily.dist200,
          holding: daily.holding,
        },
        weekly: {
          ema50: weekly.ema50,
          ema200: weekly.ema200,
          dist50: weekly.dist50,
          dist200: weekly.dist200,
          holding: weekly.holding,
        },
        why: "",
      };
      return [{ ...row, why: describeEmaWhy(row) }];
    })
    .sort((left, right) => {
      const leftDist = Math.min(
        left.daily.holding ? (left.daily.dist200 ?? 99) : 99,
        left.weekly.holding ? (left.weekly.dist200 ?? 99) : 99
      );
      const rightDist = Math.min(
        right.daily.holding ? (right.daily.dist200 ?? 99) : 99,
        right.weekly.holding ? (right.weekly.dist200 ?? 99) : 99
      );
      return leftDist - rightDist;
    });

  const deduped = dedupeEmaSetupsByTicker(setups).sort(
    (left, right) => emaNearestDist200(left) - emaNearestDist200(right)
  );

  return {
    setups: deduped,
    scanned: snapshots.length,
    asOf: new Date().toISOString(),
    timeframe: "both",
  };
}

export function buildTurtleBreakoutsFromSnapshots(
  snapshots: UniverseSnapshot[]
): TurtleBreakoutsPayload {
  const setups = snapshots
    .flatMap(({ stock, snapshot }) => {
      const price =
        snapshot.lastPrice ??
        snapshot.chart[snapshot.chart.length - 1]?.close ??
        null;
      if (price == null || snapshot.chart.length < TURTLE_LOOKBACKS.s2 + 3) {
        return [];
      }

      const dailyS1 = detectTurtleBreakout(
        snapshot.chart,
        price,
        TURTLE_LOOKBACKS.s1,
        TURTLE_LOOKBACKS.maxAgeBars
      );
      const dailyS2 = detectTurtleBreakout(
        snapshot.chart,
        price,
        TURTLE_LOOKBACKS.s2,
        TURTLE_LOOKBACKS.maxAgeBars
      );
      const weekly = detectTurtleBreakout(
        toWeeklyTurtleBars(snapshot.chart),
        price,
        TURTLE_LOOKBACKS.weekly,
        1
      );

      const hits: Array<{
        system: TurtleBreakoutRow["system"];
        channelHigh: number | null;
        extension: number | null;
        ageBars: number | null;
      }> = [];

      if (dailyS1.broken) {
        hits.push({
          system: "S1",
          channelHigh: dailyS1.channelHigh,
          extension: dailyS1.extension,
          ageBars: dailyS1.ageBars,
        });
      }
      if (dailyS2.broken) {
        hits.push({
          system: "S2",
          channelHigh: dailyS2.channelHigh,
          extension: dailyS2.extension,
          ageBars: dailyS2.ageBars,
        });
      }
      if (weekly.broken) {
        hits.push({
          system: "W20",
          channelHigh: weekly.channelHigh,
          extension: weekly.extension,
          ageBars: weekly.ageBars,
        });
      }

      return hits.map((hit) => {
        const row: TurtleBreakoutRow = {
          ticker: stock.ticker,
          name: stock.name,
          sectorLabel: findPrimarySectorLabel(stock.ticker),
          lastPrice: price,
          system: hit.system,
          channelHigh: hit.channelHigh,
          extension: hit.extension,
          ageBars: hit.ageBars,
          why: "",
        };
        return { ...row, why: describeTurtleWhy(row) };
      });
    })
    .sort((left, right) => {
      const age = (left.ageBars ?? 99) - (right.ageBars ?? 99);
      if (age !== 0) return age;
      return (left.extension ?? 99) - (right.extension ?? 99);
    });

  return {
    setups,
    scanned: snapshots.length,
    asOf: new Date().toISOString(),
    system: "any",
  };
}

let scanInflight: Promise<void> | null = null;

export async function refreshStrategyCaches(
  fresh = false,
  onProgress?: (progress: { loaded: number; total: number }) => void
) {
  if (!fresh) {
    const ema = getScreenerCache<EmaSetupsPayload>(EMA_SETUPS_CACHE_KEY);
    const turtle = getScreenerCache<TurtleBreakoutsPayload>(
      TURTLE_BREAKOUTS_CACHE_KEY
    );
    if (ema && turtle) return;
    if (scanInflight) return scanInflight;
  }

  const pending = (async () => {
    const snapshots = await loadUniverseSnapshots(fresh, onProgress);
    const ema = buildEmaSetupsFromSnapshots(snapshots);
    const turtle = buildTurtleBreakoutsFromSnapshots(snapshots);
    await Promise.all([
      persistComputedScreenerSnapshot(EMA_SETUPS_CACHE_KEY, ema),
      persistComputedScreenerSnapshot(TURTLE_BREAKOUTS_CACHE_KEY, turtle),
    ]);
  })();

  scanInflight = pending;
  try {
    await pending;
  } finally {
    if (scanInflight === pending) scanInflight = null;
  }
}

export function warmStrategyCaches() {
  void refreshStrategyCaches(false).catch(() => undefined);
}
