import { isListingMarketOpen } from "@/lib/listing-market-hours";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import {
  getScreenerCache,
  SCREENER_EOD_CACHE_TTL_MS,
  screenerCacheTtlMs,
  setScreenerCache,
} from "@/lib/screener/cache";
import {
  findSectorsForTicker,
  findStockInSectors,
  getBenchmarkSector,
  getIndianSector,
  getResearchSectors,
  INDIAN_SECTORS,
} from "@/lib/screener/indian-sectors";
import {
  emptyPeriodChanges,
  SCREENER_PERIODS,
  type PeriodChanges,
  type SectorScreenerRow,
  type SectorStockRow,
  type StockScreenerDetail,
} from "@/lib/screener/types";
import { loadAllEmaSetups } from "@/lib/screener/load-ema-setups";
import { loadAllTurtleBreakouts } from "@/lib/screener/load-turtle-breakouts";
import {
  readScreenerSnapshot,
  writeScreenerSnapshot,
} from "@/lib/screener/snapshot-store";
import { getNseScreenerSessionDate } from "@/lib/screener/session";
import {
  loadYahooSnapshot,
  YAHOO_FETCH_CONCURRENCY,
} from "@/lib/screener/yahoo-store";
import {
  averagePeriodChanges,
  hasSparsePeriodHistory,
  mergeIndexAndBasketChanges,
  subtractPeriodChanges,
  yahooSymbolForNseTicker,
  type SymbolReturnSnapshot,
} from "@/lib/screener/yahoo-returns";

const BASKET_SYNTH_LIMIT = 10;
const SECTORS_SNAPSHOT_KEY = "sectors:all";
const SECTOR_CATALOG_IDS = new Set(INDIAN_SECTORS.map((sector) => sector.id));

export type SectorRowsPayload = {
  sectors: SectorScreenerRow[];
  asOf: string;
  sessionDate: string;
};

export type SectorStocksPayload = {
  sector: SectorScreenerRow;
  stocks: SectorStockRow[];
  asOf: string;
  sessionDate: string;
};

function ttlMs() {
  return screenerCacheTtlMs(isListingMarketOpen("IN_NSE"));
}

function persistTtlMs(marketOpen: boolean) {
  return marketOpen ? ttlMs() : SCREENER_EOD_CACHE_TTL_MS;
}

function uniqueYahooSymbols(): string[] {
  const symbols = new Set<string>();
  for (const sector of INDIAN_SECTORS) {
    symbols.add(sector.yahooSymbol);
    for (const stock of sector.stocks) {
      symbols.add(yahooSymbolForNseTicker(stock.ticker));
    }
  }
  return [...symbols];
}

async function loadSnapshot(
  symbol: string,
  fresh = false
): Promise<SymbolReturnSnapshot> {
  return loadYahooSnapshot(symbol, fresh);
}

async function loadBasketChanges(
  tickers: string[],
  fresh = false
): Promise<PeriodChanges> {
  const sample = tickers.slice(0, BASKET_SYNTH_LIMIT);
  const snapshots = await mapWithConcurrency(
    sample,
    YAHOO_FETCH_CONCURRENCY,
    (ticker) => loadSnapshot(yahooSymbolForNseTicker(ticker), fresh)
  );
  return averagePeriodChanges(snapshots.map((snapshot) => snapshot.changes));
}

async function fetchOneSectorRow(
  sector: (typeof INDIAN_SECTORS)[number],
  fresh: boolean
): Promise<SectorScreenerRow> {
  const snapshot = await loadSnapshot(sector.yahooSymbol, fresh);
  let changes = snapshot.changes;
  if (hasSparsePeriodHistory(changes) && sector.stocks.length > 0) {
    const basket = await loadBasketChanges(
      sector.stocks.map((stock) => stock.ticker),
      fresh
    );
    changes = mergeIndexAndBasketChanges(changes, basket);
  }
  return {
    id: sector.id,
    label: sector.label,
    symbol: sector.yahooSymbol,
    isBenchmark: Boolean(sector.isBenchmark),
    lastPrice: snapshot.lastPrice,
    changes,
  };
}

async function fetchSectorRows(fresh: boolean): Promise<SectorScreenerRow[]> {
  return mapWithConcurrency(INDIAN_SECTORS, 8, (sector) =>
    fetchOneSectorRow(sector, fresh)
  );
}

function orderCatalogSectors(rows: SectorScreenerRow[]): SectorScreenerRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return INDIAN_SECTORS.flatMap((sector) => {
    const row = byId.get(sector.id);
    return row ? [row] : [];
  });
}

function isCompleteSectorCatalog(rows: SectorScreenerRow[]): boolean {
  if (rows.length < INDIAN_SECTORS.length) return false;
  const ids = new Set(rows.map((row) => row.id));
  return INDIAN_SECTORS.every((sector) => ids.has(sector.id));
}

async function completeSectorPayload(
  payload: SectorRowsPayload,
  fresh: boolean
): Promise<SectorRowsPayload> {
  const known = payload.sectors.filter((row) => SECTOR_CATALOG_IDS.has(row.id));
  const have = new Set(known.map((row) => row.id));
  const missing = INDIAN_SECTORS.filter((sector) => !have.has(sector.id));
  const extras =
    missing.length > 0
      ? await mapWithConcurrency(missing, 8, (sector) =>
          fetchOneSectorRow(sector, fresh)
        )
      : [];

  return {
    ...payload,
    sectors: orderCatalogSectors([...known, ...extras]),
    asOf: extras.length > 0 ? new Date().toISOString() : payload.asOf,
  };
}

async function fetchSectorStocks(
  sectorId: string,
  fresh: boolean
): Promise<SectorStocksPayload | null> {
  const sector = getIndianSector(sectorId);
  if (!sector || sector.isBenchmark) return null;

  const sessionDate = getNseScreenerSessionDate();
  const [sectorSnap, niftySnap, stockSnaps] = await Promise.all([
    loadSnapshot(sector.yahooSymbol, fresh),
    loadSnapshot(getBenchmarkSector().yahooSymbol, fresh),
    mapWithConcurrency(sector.stocks, YAHOO_FETCH_CONCURRENCY, async (stock) => {
      const snapshot = await loadSnapshot(
        yahooSymbolForNseTicker(stock.ticker),
        fresh
      );
      return { stock, snapshot };
    }),
  ]);

  const sectorChanges = hasSparsePeriodHistory(sectorSnap.changes)
    ? mergeIndexAndBasketChanges(
        sectorSnap.changes,
        averagePeriodChanges(stockSnaps.map(({ snapshot }) => snapshot.changes))
      )
    : sectorSnap.changes;

  return {
    sector: {
      id: sector.id,
      label: sector.label,
      symbol: sector.yahooSymbol,
      isBenchmark: false,
      lastPrice: sectorSnap.lastPrice,
      changes: sectorChanges,
    },
    stocks: stockSnaps.map(({ stock, snapshot }) => ({
      ticker: stock.ticker,
      name: stock.name,
      lastPrice: snapshot.lastPrice,
      changes: snapshot.changes,
      vsSector: subtractPeriodChanges(snapshot.changes, sectorChanges),
      vsNifty: subtractPeriodChanges(snapshot.changes, niftySnap.changes),
    })),
    asOf: new Date().toISOString(),
    sessionDate,
  };
}

async function persistPayload<T extends { sessionDate: string }>(
  snapshotKey: string,
  payload: T,
  marketOpen: boolean
) {
  setScreenerCache(snapshotKey, payload, persistTtlMs(marketOpen));
  if (!marketOpen) {
    await writeScreenerSnapshot(snapshotKey, payload.sessionDate, payload);
  }
}

async function persistYahooSnapshots(sessionDate: string, symbols: string[]) {
  await mapWithConcurrency(symbols, YAHOO_FETCH_CONCURRENCY, async (symbol) => {
    const snapshot = getScreenerCache<SymbolReturnSnapshot>(`yahoo:${symbol}`);
    if (!snapshot) return;
    await writeScreenerSnapshot(`yahoo:${symbol}`, sessionDate, snapshot);
  });
}

export async function loadSectorRows(fresh = false): Promise<SectorRowsPayload> {
  const sessionDate = getNseScreenerSessionDate();
  const marketOpen = isListingMarketOpen("IN_NSE");
  const shouldRefresh = fresh && !marketOpen;

  if (!shouldRefresh) {
    const cached = getScreenerCache<SectorRowsPayload>(SECTORS_SNAPSHOT_KEY);
    if (cached && isCompleteSectorCatalog(cached.sectors)) return cached;

    const stored = await readScreenerSnapshot<SectorRowsPayload>(
      SECTORS_SNAPSHOT_KEY
    );
    const base = cached
      ?? (stored
        ? {
            ...stored.payload,
            sessionDate: stored.sessionDate,
            asOf: stored.updatedAt,
          }
        : null);

    if (base) {
      const payload = await completeSectorPayload(base, false);
      if (payload.sectors.length !== base.sectors.length) {
        await persistPayload(SECTORS_SNAPSHOT_KEY, payload, marketOpen);
      } else {
        setScreenerCache(SECTORS_SNAPSHOT_KEY, payload, SCREENER_EOD_CACHE_TTL_MS);
      }
      return payload;
    }
  }

  const payload: SectorRowsPayload = {
    sectors: await fetchSectorRows(shouldRefresh || fresh),
    asOf: new Date().toISOString(),
    sessionDate,
  };
  await persistPayload(SECTORS_SNAPSHOT_KEY, payload, marketOpen);
  return payload;
}

export async function loadSectorStocks(
  sectorId: string,
  fresh = false
): Promise<SectorStocksPayload | null> {
  const sector = getIndianSector(sectorId);
  if (!sector || sector.isBenchmark) return null;

  const marketOpen = isListingMarketOpen("IN_NSE");
  const shouldRefresh = fresh && !marketOpen;
  const cacheKey = `sector-stocks:${sectorId}`;

  if (!shouldRefresh) {
    const cached = getScreenerCache<SectorStocksPayload>(cacheKey);
    if (cached) return cached;

    const stored = await readScreenerSnapshot<SectorStocksPayload>(cacheKey);
    if (stored) {
      const payload = {
        ...stored.payload,
        sessionDate: stored.sessionDate,
        asOf: stored.updatedAt,
      };
      setScreenerCache(cacheKey, payload, SCREENER_EOD_CACHE_TTL_MS);
      return payload;
    }
  }

  const payload = await fetchSectorStocks(sectorId, shouldRefresh || fresh);
  if (!payload) return null;
  await persistPayload(cacheKey, payload, marketOpen);
  return payload;
}

export async function refreshScreenerDailySnapshot(): Promise<{
  sessionDate: string;
  symbols: number;
  sectors: number;
  stockLists: number;
  emaSetups: number;
  turtleSetups: number;
  persisted: boolean;
}> {
  const sessionDate = getNseScreenerSessionDate();
  const symbols = uniqueYahooSymbols();
  await mapWithConcurrency(symbols, YAHOO_FETCH_CONCURRENCY, (symbol) =>
    loadSnapshot(symbol, true)
  );

  const sectorsPayload: SectorRowsPayload = {
    sectors: await fetchSectorRows(false),
    asOf: new Date().toISOString(),
    sessionDate,
  };
  const sectorsOk = await writeScreenerSnapshot(
    SECTORS_SNAPSHOT_KEY,
    sessionDate,
    sectorsPayload
  );
  setScreenerCache(SECTORS_SNAPSHOT_KEY, sectorsPayload, SCREENER_EOD_CACHE_TTL_MS);

  let stockLists = 0;
  let stockListsOk = true;
  for (const sector of getResearchSectors()) {
    const pack = await fetchSectorStocks(sector.id, false);
    if (!pack) continue;
    const written = await writeScreenerSnapshot(
      `sector-stocks:${sector.id}`,
      sessionDate,
      pack
    );
    setScreenerCache(`sector-stocks:${sector.id}`, pack, SCREENER_EOD_CACHE_TTL_MS);
    stockLists += 1;
    stockListsOk = stockListsOk && written;
  }

  await persistYahooSnapshots(sessionDate, symbols);
  const [emaPayload, turtlePayload] = await Promise.all([
    loadAllEmaSetups(false),
    loadAllTurtleBreakouts(false),
  ]);

  return {
    sessionDate,
    symbols: symbols.length,
    sectors: sectorsPayload.sectors.length,
    stockLists,
    emaSetups: emaPayload.setups.length,
    turtleSetups: turtlePayload.setups.length,
    persisted: sectorsOk && stockListsOk,
  };
}

export async function loadStockDetail(
  ticker: string,
  sectorId?: string | null
): Promise<StockScreenerDetail | null> {
  const key = normalizeEquityTicker(ticker);
  if (!key) return null;

  const listed = findStockInSectors(key);
  const requested = sectorId ? getIndianSector(sectorId) : undefined;
  const sector =
    requested && !requested.isBenchmark
      ? requested
      : findSectorsForTicker(key)[0];

  const [stockSnap, niftySnap, sectorPack] = await Promise.all([
    loadSnapshot(yahooSymbolForNseTicker(key)),
    loadSnapshot(getBenchmarkSector().yahooSymbol),
    sector && !sector.isBenchmark ? loadSectorStocks(sector.id) : Promise.resolve(null),
  ]);

  if (stockSnap.lastPrice == null && stockSnap.chart.length === 0 && !listed) {
    return null;
  }

  const stockRow = sectorPack?.stocks.find(
    (row) => normalizeEquityTicker(row.ticker) === key
  );

  const sectorRank = sectorPack
    ? Object.fromEntries(
        SCREENER_PERIODS.map((period) => {
          const ranked = [...sectorPack.stocks]
            .filter((row) => row.changes[period] != null)
            .sort(
              (a, b) =>
                (b.changes[period] ?? -Infinity) - (a.changes[period] ?? -Infinity)
            );
          const index = ranked.findIndex(
            (row) => normalizeEquityTicker(row.ticker) === key
          );
          return [period, index >= 0 ? index + 1 : null];
        })
      )
    : null;

  return {
    ticker: listed?.ticker ?? key,
    name: listed?.name ?? key,
    lastPrice: stockSnap.lastPrice,
    currency: "INR",
    sectorId: sector && !sector.isBenchmark ? sector.id : null,
    sectorLabel: sector && !sector.isBenchmark ? sector.label : null,
    changes: stockSnap.changes,
    vsSector: stockRow?.vsSector ?? (sectorPack ? emptyPeriodChanges() : null),
    vsNifty: subtractPeriodChanges(stockSnap.changes, niftySnap.changes),
    sectorRank,
    sectorCount: sectorPack?.stocks.length ?? null,
    chart: stockSnap.chart,
  };
}
