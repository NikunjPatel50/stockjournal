import { isListingMarketOpen } from "@/lib/listing-market-hours";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";
import {
  getScreenerCache,
  SCREENER_EOD_CACHE_TTL_MS,
  screenerCacheTtlMs,
  setScreenerCache,
} from "@/lib/screener/cache";
import { dedupeRowsByTicker } from "@/lib/screener/dedupe-rows";
import {
  findSectorsForTicker,
  findStockInSectors,
  getBenchmarkSector,
  getIndianSector,
  INDIAN_SECTORS,
  sectorReturnStockTickers,
} from "@/lib/screener/indian-sectors";
import {
  getNseSectorCatalog,
  getNseSectorLabel,
  NSE_ALL_SECTOR_IDS,
} from "@/lib/screener/nse-all-sectors";
import {
  loadNseIndexDirectory,
  mergeNseWithSupplementalChanges,
  needsSupplementalSectorPeriods,
  nseQuoteForSectorId,
  periodChangesFromNseQuote,
  type NseIndexQuote,
} from "@/lib/screener/nse-index-returns";
import {
  emptyPeriodChanges,
  SCREENER_PERIODS,
  type PeriodChanges,
  type SectorScreenerRow,
  type SectorStockRow,
  type StockScreenerDetail,
} from "@/lib/screener/types";
import { loadAllEmaSetups } from "@/lib/screener/load-ema-setups";
import { loadAllMomentumSetups } from "@/lib/screener/load-momentum-setups";
import { loadAllTurtleBreakouts } from "@/lib/screener/load-turtle-breakouts";
import {
  readScreenerSnapshot,
  writeScreenerSnapshot,
} from "@/lib/screener/snapshot-store";
import { getNseScreenerSessionDate } from "@/lib/screener/session";
import {
  loadYahooReturnsSnapshot,
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
const SECTORS_SNAPSHOT_KEY = "sectors:nse-all-v7";
const SECTOR_CATALOG = getNseSectorCatalog();
const SECTOR_CATALOG_IDS = new Set<string>(NSE_ALL_SECTOR_IDS);

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

export type SectorStocksListener = {
  onMeta?: (payload: SectorStocksPayload) => void;
  onStock?: (stock: SectorStockRow, loaded: number, total: number) => void;
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
  fresh: boolean
): Promise<PeriodChanges> {
  const sample = tickers.slice(0, BASKET_SYNTH_LIMIT);
  const snapshots = await mapWithConcurrency(
    sample,
    YAHOO_FETCH_CONCURRENCY,
    (ticker) => loadSnapshot(yahooSymbolForNseTicker(ticker), fresh)
  );
  return averagePeriodChanges(snapshots.map((snapshot) => snapshot.changes));
}

async function fillMissingLongerPeriods(
  sector: (typeof INDIAN_SECTORS)[number],
  changes: PeriodChanges,
  fresh: boolean,
  yahooChangesBySymbol: Map<string, PeriodChanges>
): Promise<PeriodChanges> {
  if (!needsSupplementalSectorPeriods(changes)) return changes;

  let supplemental = yahooChangesBySymbol.get(sector.yahooSymbol);
  if (!supplemental) {
    const snapshot = await loadSnapshot(sector.yahooSymbol, fresh);
    supplemental = snapshot.changes;
    yahooChangesBySymbol.set(sector.yahooSymbol, supplemental);
  }
  let next = mergeNseWithSupplementalChanges(changes, supplemental);
  if (!needsSupplementalSectorPeriods(next)) return next;

  const tickers = sectorReturnStockTickers(sector);
  if (tickers.length === 0) return next;

  const basket = await loadBasketChanges(tickers, fresh);
  return mergeNseWithSupplementalChanges(next, basket);
}

async function fetchOneSectorRow(
  sector: (typeof INDIAN_SECTORS)[number],
  fresh: boolean,
  nseDirectory: Map<string, NseIndexQuote>,
  yahooChangesBySymbol: Map<string, PeriodChanges>
): Promise<SectorScreenerRow> {
  const nseQuote = nseQuoteForSectorId(sector.id, nseDirectory);

  if (nseQuote) {
    const changes = await fillMissingLongerPeriods(
      sector,
      periodChangesFromNseQuote(nseQuote),
      fresh,
      yahooChangesBySymbol
    );

    return {
      id: sector.id,
      label: getNseSectorLabel(sector.id) ?? sector.label,
      symbol: sector.yahooSymbol,
      isBenchmark: Boolean(sector.isBenchmark),
      lastPrice: nseQuote.last,
      changes,
    };
  }

  const snapshot = await loadSnapshot(sector.yahooSymbol, fresh);
  yahooChangesBySymbol.set(sector.yahooSymbol, snapshot.changes);
  const changes = await fillMissingLongerPeriods(
    sector,
    snapshot.changes,
    fresh,
    yahooChangesBySymbol
  );

  return {
    id: sector.id,
    label: getNseSectorLabel(sector.id) ?? sector.label,
    symbol: sector.yahooSymbol,
    isBenchmark: Boolean(sector.isBenchmark),
    lastPrice: snapshot.lastPrice,
    changes,
  };
}

function overlayNseQuotes(
  rows: SectorScreenerRow[],
  directory: Map<string, NseIndexQuote>
): SectorScreenerRow[] {
  if (directory.size === 0) return rows;

  return rows.map((row) => {
    const nseQuote = nseQuoteForSectorId(row.id, directory);
    if (!nseQuote) return row;

    const nse = periodChangesFromNseQuote(nseQuote);
    return {
      ...row,
      lastPrice: nseQuote.last,
      changes: {
        ...row.changes,
        "1d": nse["1d"] ?? row.changes["1d"],
        "1w": nse["1w"] ?? row.changes["1w"],
        "1m": nse["1m"] ?? row.changes["1m"],
        "1y": nse["1y"] ?? row.changes["1y"],
      },
    };
  });
}

async function overlayNseQuotesOnRows(
  rows: SectorScreenerRow[],
  fresh: boolean
): Promise<SectorScreenerRow[]> {
  const directory = await loadNseIndexDirectory(fresh);
  return overlayNseQuotes(rows, directory);
}

async function fillSparseSectorRows(
  rows: SectorScreenerRow[],
  fresh: boolean,
  onProgress?: (progress: SectorLoadProgress) => void
): Promise<SectorScreenerRow[]> {
  const yahooChangesBySymbol = new Map<string, PeriodChanges>();
  const total = rows.length;
  let loaded = 0;
  return mapWithConcurrency(rows, 8, async (row) => {
    try {
      if (!needsSupplementalSectorPeriods(row.changes)) return row;
      const sector = getIndianSector(row.id);
      if (!sector) return row;
      const changes = await fillMissingLongerPeriods(
        sector,
        row.changes,
        fresh,
        yahooChangesBySymbol
      );
      return { ...row, changes };
    } finally {
      loaded += 1;
      onProgress?.({ loaded, total });
    }
  });
}

export type SectorLoadProgress = {
  loaded: number;
  total: number;
};

async function fetchSectorRows(
  fresh: boolean,
  onProgress?: (progress: SectorLoadProgress) => void
): Promise<SectorScreenerRow[]> {
  const total = SECTOR_CATALOG.length;
  let loaded = 0;
  onProgress?.({ loaded, total });

  const nseDirectory = await loadNseIndexDirectory(fresh);
  const yahooChangesBySymbol = new Map<string, PeriodChanges>();

  const rows = await mapWithConcurrency(SECTOR_CATALOG, 8, async (sector) => {
    const row = await fetchOneSectorRow(
      sector,
      fresh,
      nseDirectory,
      yahooChangesBySymbol
    );
    loaded += 1;
    onProgress?.({ loaded, total });
    return row;
  });

  return rows;
}

function orderCatalogSectors(rows: SectorScreenerRow[]): SectorScreenerRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return NSE_ALL_SECTOR_IDS.flatMap((sectorId) => {
    const row = byId.get(sectorId);
    return row ? [row] : [];
  });
}

function normalizeSectorPayload(
  payload: SectorRowsPayload
): SectorRowsPayload {
  return {
    ...payload,
    sectors: orderCatalogSectors(payload.sectors),
  };
}

function isCompleteSectorCatalog(rows: SectorScreenerRow[]): boolean {
  if (rows.length !== SECTOR_CATALOG.length) return false;
  const ids = new Set(rows.map((row) => row.id));
  return SECTOR_CATALOG.every((sector) => ids.has(sector.id));
}

async function completeSectorPayload(
  payload: SectorRowsPayload,
  fresh: boolean,
  onProgress?: (progress: SectorLoadProgress) => void
): Promise<SectorRowsPayload> {
  const known = payload.sectors.filter((row) => SECTOR_CATALOG_IDS.has(row.id));
  const have = new Set(known.map((row) => row.id));
  const missing = SECTOR_CATALOG.filter((sector) => !have.has(sector.id));
  const nseDirectory = await loadNseIndexDirectory(fresh);
  const yahooChangesBySymbol = new Map<string, PeriodChanges>();
  let loaded = known.length;
  const extras =
    missing.length > 0
      ? await mapWithConcurrency(missing, 8, async (sector) => {
          const row = await fetchOneSectorRow(
            sector,
            fresh,
            nseDirectory,
            yahooChangesBySymbol
          );
          loaded += 1;
          onProgress?.({ loaded, total: SECTOR_CATALOG.length });
          return row;
        })
      : [];

  const merged = orderCatalogSectors([...known, ...extras]);
  let sectors = await overlayNseQuotesOnRows(merged, fresh);
  if (sectors.some((row) => needsSupplementalSectorPeriods(row.changes))) {
    sectors = await fillSparseSectorRows(
      sectors,
      fresh,
      missing.length > 0 ? undefined : onProgress
    );
  } else {
    onProgress?.({ loaded: sectors.length, total: SECTOR_CATALOG.length });
  }

  return normalizeSectorPayload({
    ...payload,
    sectors,
    asOf:
      extras.length > 0 || sectors !== merged
        ? new Date().toISOString()
        : payload.asOf,
  });
}

function blankStockRow(stock: { ticker: string; name: string }): SectorStockRow {
  return {
    ticker: stock.ticker,
    name: stock.name,
    lastPrice: null,
    changes: emptyPeriodChanges(),
    vsSector: emptyPeriodChanges(),
    vsNifty: emptyPeriodChanges(),
  };
}

function stockRowFromSnapshot(
  stock: { ticker: string; name: string },
  snapshot: SymbolReturnSnapshot,
  sectorChanges: PeriodChanges,
  niftyChanges: PeriodChanges
): SectorStockRow {
  return {
    ticker: stock.ticker,
    name: stock.name,
    lastPrice: snapshot.lastPrice,
    changes: snapshot.changes,
    vsSector: subtractPeriodChanges(snapshot.changes, sectorChanges),
    vsNifty: subtractPeriodChanges(snapshot.changes, niftyChanges),
  };
}

async function fetchSectorStocks(
  sectorId: string,
  fresh: boolean,
  listener?: SectorStocksListener
): Promise<SectorStocksPayload | null> {
  const sector = getIndianSector(sectorId);
  if (!sector || sector.isBenchmark) return null;

  const sessionDate = getNseScreenerSessionDate();
  const total = sector.stocks.length;
  listener?.onMeta?.({
    sector: {
      id: sector.id,
      label: sector.label,
      symbol: sector.yahooSymbol,
      isBenchmark: false,
      lastPrice: null,
      changes: emptyPeriodChanges(),
    },
    stocks: sector.stocks.map(blankStockRow),
    asOf: new Date().toISOString(),
    sessionDate,
  });

  const headerReady = Promise.all([
    loadYahooReturnsSnapshot(sector.yahooSymbol, fresh),
    loadYahooReturnsSnapshot(getBenchmarkSector().yahooSymbol, fresh),
  ]);

  let loaded = 0;
  const stockSnaps = await mapWithConcurrency(
    sector.stocks,
    YAHOO_FETCH_CONCURRENCY,
    async (stock) => {
      const [snapshot, [sectorSnap, niftySnap]] = await Promise.all([
        loadYahooReturnsSnapshot(yahooSymbolForNseTicker(stock.ticker), fresh),
        headerReady,
      ]);
      loaded += 1;
      const preliminary = stockRowFromSnapshot(
        stock,
        snapshot,
        sectorSnap.changes,
        niftySnap.changes
      );
      listener?.onStock?.(preliminary, loaded, total);
      return { stock, snapshot, sectorSnap, niftySnap };
    }
  );

  const sectorSnap = stockSnaps[0]?.sectorSnap;
  const niftySnap = stockSnaps[0]?.niftySnap;
  const resolvedHeader =
    sectorSnap && niftySnap
      ? { sectorSnap, niftySnap }
      : {
          sectorSnap: (await headerReady)[0],
          niftySnap: (await headerReady)[1],
        };

  const sectorChanges = hasSparsePeriodHistory(resolvedHeader.sectorSnap.changes)
    ? mergeIndexAndBasketChanges(
        resolvedHeader.sectorSnap.changes,
        averagePeriodChanges(stockSnaps.map(({ snapshot }) => snapshot.changes))
      )
    : resolvedHeader.sectorSnap.changes;

  return {
    sector: {
      id: sector.id,
      label: sector.label,
      symbol: sector.yahooSymbol,
      isBenchmark: false,
      lastPrice: resolvedHeader.sectorSnap.lastPrice,
      changes: sectorChanges,
    },
    stocks: dedupeRowsByTicker(
      stockSnaps.map(({ stock, snapshot }) =>
        stockRowFromSnapshot(
          stock,
          snapshot,
          sectorChanges,
          resolvedHeader.niftySnap.changes
        )
      )
    ),
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

export async function loadSectorRows(
  fresh = false,
  onProgress?: (progress: SectorLoadProgress) => void
): Promise<SectorRowsPayload> {
  const sessionDate = getNseScreenerSessionDate();
  const marketOpen = isListingMarketOpen("IN_NSE");

  if (!fresh) {
    const cached = getScreenerCache<SectorRowsPayload>(SECTORS_SNAPSHOT_KEY);
    if (cached && isCompleteSectorCatalog(cached.sectors)) {
      const normalized = normalizeSectorPayload(cached);
      let sectors = await overlayNseQuotesOnRows(normalized.sectors, false);
      if (sectors.some((row) => needsSupplementalSectorPeriods(row.changes))) {
        sectors = await fillSparseSectorRows(sectors, false, onProgress);
        const payload = { ...normalized, sectors };
        await persistPayload(SECTORS_SNAPSHOT_KEY, payload, marketOpen);
        return payload;
      }
      onProgress?.({
        loaded: sectors.length,
        total: SECTOR_CATALOG.length,
      });
      return { ...normalized, sectors };
    }

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
      const payload = await completeSectorPayload(base, false, onProgress);
      if (payload.sectors.length !== base.sectors.length) {
        await persistPayload(SECTORS_SNAPSHOT_KEY, payload, marketOpen);
      } else {
        setScreenerCache(SECTORS_SNAPSHOT_KEY, payload, SCREENER_EOD_CACHE_TTL_MS);
      }
      return payload;
    }
  }

  const rows = await fetchSectorRows(fresh, onProgress);
  const payload = normalizeSectorPayload({
    sectors: rows,
    asOf: new Date().toISOString(),
    sessionDate,
  });
  await persistPayload(SECTORS_SNAPSHOT_KEY, payload, marketOpen);
  return payload;
}

export function readCachedSectorStocks(
  sectorId: string
): SectorStocksPayload | null {
  const sector = getIndianSector(sectorId);
  if (!sector || sector.isBenchmark) return null;
  const cached = getScreenerCache<SectorStocksPayload>(
    `sector-stocks:v8:${sectorId}`
  );
  if (!cached) return null;
  if (sector.stocks.length > 0 && cached.stocks.length === 0) return null;
  return cached;
}

export async function loadSectorStocks(
  sectorId: string,
  fresh = false,
  listener?: SectorStocksListener
): Promise<SectorStocksPayload | null> {
  const sector = getIndianSector(sectorId);
  if (!sector || sector.isBenchmark) return null;

  const marketOpen = isListingMarketOpen("IN_NSE");
  const shouldRefresh = fresh && !marketOpen;
  const cacheKey = `sector-stocks:v8:${sectorId}`;

  const catalogHasStocks = sector.stocks.length > 0;
  const usable = (payload: SectorStocksPayload | null | undefined) =>
    Boolean(payload) && !(catalogHasStocks && payload!.stocks.length === 0);

  if (!shouldRefresh) {
    const cached = getScreenerCache<SectorStocksPayload>(cacheKey);
    if (usable(cached)) return cached!;

    const stored = await readScreenerSnapshot<SectorStocksPayload>(cacheKey);
    if (stored && usable(stored.payload)) {
      const payload = {
        ...stored.payload,
        sessionDate: stored.sessionDate,
        asOf: stored.updatedAt,
      };
      setScreenerCache(cacheKey, payload, SCREENER_EOD_CACHE_TTL_MS);
      return payload;
    }
  }

  const payload = await fetchSectorStocks(
    sectorId,
    shouldRefresh || fresh,
    listener
  );
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
  momentumSetups: number;
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
  for (const sector of SECTOR_CATALOG.filter((row) => !row.isBenchmark)) {
    const pack = await fetchSectorStocks(sector.id, false);
    if (!pack) continue;
    const written = await writeScreenerSnapshot(
      `sector-stocks:v8:${sector.id}`,
      sessionDate,
      pack
    );
    setScreenerCache(`sector-stocks:v8:${sector.id}`, pack, SCREENER_EOD_CACHE_TTL_MS);
    stockLists += 1;
    stockListsOk = stockListsOk && written;
  }

  await persistYahooSnapshots(sessionDate, symbols);
  const [emaPayload, turtlePayload, momentumPayload] = await Promise.all([
    loadAllEmaSetups(false),
    loadAllTurtleBreakouts(false),
    loadAllMomentumSetups(false),
  ]);

  return {
    sessionDate,
    symbols: symbols.length,
    sectors: sectorsPayload.sectors.length,
    stockLists,
    emaSetups: emaPayload.setups.length,
    turtleSetups: turtlePayload.setups.length,
    momentumSetups: momentumPayload.setups.length,
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
