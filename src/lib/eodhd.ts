import type { AssetClass } from "@/lib/journal-types";
import type { CurrencyCode } from "@/lib/settings";
import { normalizeEquityTicker } from "@/lib/ticker-normalize";

const EODHD_API_BASE = "https://eodhd.com/api";

export type MarketQuote = {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  timestamp: number | null;
  /** When set, format price in this currency (e.g. INR for NSE names). */
  currency?: CurrencyCode;
};

type EodhdRealtimeRow = {
  code?: string;
  close?: number | string;
  previousClose?: number | string;
  change_p?: number | string;
  timestamp?: number | string;
};

const EXCHANGE_SUFFIX =
  /\.(US|CC|FOREX|NSE|BSE|LSE|TO|V|PA|AS|SW|XETRA|HK|AU|INDX)$/i;

export type EquityExchangeHint = "US" | "NSE";

export function defaultEquityExchangeForCurrency(
  currency: CurrencyCode
): EquityExchangeHint {
  return currency === "INR" ? "NSE" : "US";
}

function mapEodhdCurrency(value?: string): CurrencyCode | undefined {
  const code = value?.trim().toUpperCase();
  if (
    code === "USD" ||
    code === "EUR" ||
    code === "GBP" ||
    code === "INR" ||
    code === "CAD"
  ) {
    return code;
  }
  return undefined;
}

function cleanTicker(ticker: string): string {
  return normalizeEquityTicker(ticker);
}

/** Map journal ticker + asset class to an EODHD symbol (live delayed feed). */
export function toEodhdSymbol(
  ticker: string,
  assetClass: AssetClass,
  equityExchange: EquityExchangeHint = "US"
): string | null {
  const raw = cleanTicker(ticker);
  if (!raw) return null;

  if (EXCHANGE_SUFFIX.test(raw)) {
    return raw;
  }

  switch (assetClass) {
    case "Equities":
      return `${raw}.${equityExchange}`;
    case "Crypto": {
      if (raw.includes("-")) return `${raw}.CC`;
      if (raw.endsWith("USD") && raw.length > 3) {
        return `${raw.slice(0, -3)}-USD.CC`;
      }
      return `${raw}-USD.CC`;
    }
    case "Forex":
      return `${raw}.FOREX`;
    case "Options":
      return null;
    default:
      return `${raw}.US`;
  }
}

/** Try primary exchange, then a common alternate (e.g. US ↔ NSE). */
export function eodhdSymbolCandidates(
  ticker: string,
  assetClass: AssetClass,
  equityExchange: EquityExchangeHint = "US"
): string[] {
  const raw = cleanTicker(ticker);
  if (!raw) return [];

  if (EXCHANGE_SUFFIX.test(raw)) {
    return [raw];
  }

  if (assetClass !== "Equities") {
    const single = toEodhdSymbol(ticker, assetClass, equityExchange);
    return single ? [single] : [];
  }

  const primary = `${raw}.${equityExchange}`;
  const alternate = equityExchange === "US" ? `${raw}.NSE` : `${raw}.US`;
  return primary === alternate ? [primary] : [primary, alternate];
}

function parseNumericField(
  value: number | string | undefined
): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toUpperCase() === "NA") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return Number.isFinite(value) ? value : null;
}

function parseRow(row: EodhdRealtimeRow): MarketQuote | null {
  const symbol = row.code?.trim();
  if (!symbol) return null;

  const price =
    parseNumericField(row.close) ?? parseNumericField(row.previousClose);

  const ts = parseNumericField(row.timestamp);

  return {
    symbol,
    price,
    changePercent: parseNumericField(row.change_p),
    timestamp: ts,
  };
}

/** True when quote came from the real-time feed (not static EOD/search close only). */
export function isLiveMarketQuote(quote: MarketQuote): boolean {
  return (
    quote.changePercent !== null ||
    (quote.timestamp !== null && quote.timestamp > 0)
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function isEodhdNotFoundBody(text: string): boolean {
  const t = text.trim();
  return t === "Ticker Not Found" || t.startsWith("Ticker Not Found");
}

async function fetchEodhdRealtimeBatch(
  symbols: string[],
  apiKey: string
): Promise<Map<string, MarketQuote>> {
  const result = new Map<string, MarketQuote>();
  if (symbols.length === 0) return result;

  const [primary, ...rest] = symbols;
  const url = new URL(
    `${EODHD_API_BASE}/real-time/${encodeURIComponent(primary)}`
  );
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");
  if (rest.length > 0) {
    url.searchParams.set("s", rest.join(","));
  }

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const text = await res.text();

  if (isEodhdNotFoundBody(text) || res.status === 404) {
    return result;
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `EODHD authentication failed (${res.status})`
      );
    }
    return result;
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return result;
  }

  const rows: EodhdRealtimeRow[] = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? [data as EodhdRealtimeRow]
      : [];

  for (const row of rows) {
    const quote = parseRow(row);
    if (quote) result.set(quote.symbol, quote);
  }

  return result;
}

async function fetchEodhdLatestEodClose(
  symbol: string,
  apiKey: string
): Promise<MarketQuote | null> {
  const url = new URL(`${EODHD_API_BASE}/eod/${encodeURIComponent(symbol)}`);
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("order", "d");

  const res = await fetch(url.toString(), { cache: "no-store" });
  const text = await res.text();
  if (!res.ok || isEodhdNotFoundBody(text)) return null;

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;

  const row = data[0] as { close?: number | string; date?: string };
  const price = parseNumericField(row.close);
  if (price === null) return null;

  return {
    symbol,
    price,
    changePercent: null,
    timestamp: null,
  };
}

async function fetchSearchFallbackQuote(
  ticker: string,
  apiKey: string
): Promise<MarketQuote | null> {
  const base = cleanTicker(ticker);
  const url = new URL(`${EODHD_API_BASE}/search/${encodeURIComponent(base)}`);
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("limit", "8");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;

  const rows = (await res.json()) as Array<{
    Code?: string;
    Exchange?: string;
    Currency?: string;
    previousClose?: number | string;
  }>;

  if (!Array.isArray(rows) || rows.length === 0) return null;

  const match =
    rows.find((r) => r.Code?.toUpperCase() === base) ??
    rows.find((r) => r.Code?.toUpperCase().startsWith(base)) ??
    rows[0];

  if (!match.Code || !match.Exchange) return null;

  const resolvedSymbol = `${match.Code}.${match.Exchange}`;
  const currency = mapEodhdCurrency(match.Currency);

  const live = await resolveQuoteForSymbol(resolvedSymbol, apiKey);
  if (live?.price !== null && live?.price !== undefined) {
    return {
      ...live,
      symbol: resolvedSymbol,
      currency: currency ?? live.currency,
    };
  }

  const price = parseNumericField(match.previousClose);
  if (price === null) return null;

  return {
    symbol: resolvedSymbol,
    price,
    changePercent: null,
    timestamp: null,
    currency,
  };
}

async function resolveQuoteForSymbol(
  symbol: string,
  apiKey: string
): Promise<MarketQuote | null> {
  const batch = await fetchEodhdRealtimeBatch([symbol], apiKey);
  const live =
    batch.get(symbol) ??
    [...batch.values()].find(
      (q) => q.symbol.toUpperCase() === symbol.toUpperCase()
    );
  if (live?.price !== null && live?.price !== undefined) {
    return live;
  }

  const eod = await fetchEodhdLatestEodClose(symbol, apiKey);
  if (eod?.price !== null && eod?.price !== undefined) {
    return eod;
  }

  return live ?? null;
}

/** Fetch delayed live quotes; falls back to latest EOD close when needed. */
export async function fetchEodhdRealtimeQuotes(
  symbols: string[],
  apiKey: string
): Promise<Map<string, MarketQuote>> {
  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))];
  const result = new Map<string, MarketQuote>();
  if (unique.length === 0) return result;

  const batches = chunk(unique, 20);

  for (const batch of batches) {
    const batchMap = await fetchEodhdRealtimeBatch(batch, apiKey);

    for (const symbol of batch) {
      const live = batchMap.get(symbol);
      if (live?.price !== null && live?.price !== undefined) {
        result.set(symbol, live);
        continue;
      }
      const resolved = await resolveQuoteForSymbol(symbol, apiKey);
      if (resolved) result.set(symbol, resolved);
    }
  }

  return result;
}

/** Batch realtime quotes only — no per-symbol EOD/search fallback (use Yahoo for gaps). */
export async function fetchEodhdRealtimeQuotesBatchOnly(
  symbols: string[],
  apiKey: string
): Promise<Map<string, MarketQuote>> {
  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))];
  const result = new Map<string, MarketQuote>();
  if (unique.length === 0) return result;

  const batches = chunk(unique, 20);
  await Promise.all(
    batches.map(async (batch) => {
      const batchMap = await fetchEodhdRealtimeBatch(batch, apiKey);
      for (const [symbol, quote] of batchMap) {
        result.set(symbol, quote);
      }
    })
  );

  return result;
}

export async function fetchEodhdQuoteForTrade(
  ticker: string,
  assetClass: AssetClass,
  apiKey: string,
  equityExchange: EquityExchangeHint = "US"
): Promise<MarketQuote | null> {
  const candidates = eodhdSymbolCandidates(ticker, assetClass, equityExchange);
  let fallback: MarketQuote | null = null;

  for (const symbol of candidates) {
    const quote = await resolveQuoteForSymbol(symbol, apiKey);
    if (quote?.price === null || quote?.price === undefined) continue;
    if (isLiveMarketQuote(quote)) return quote;
    fallback ??= quote;
  }

  if (assetClass === "Equities") {
    const searchQuote = await fetchSearchFallbackQuote(ticker, apiKey);
    if (searchQuote?.price !== null && searchQuote?.price !== undefined) {
      if (isLiveMarketQuote(searchQuote)) return searchQuote;
      fallback ??= searchQuote;
    }
  }

  return fallback;
}

export function quoteLookupKey(ticker: string, assetClass: AssetClass): string {
  return `${cleanTicker(ticker)}::${assetClass}`;
}

export function normalizeQuoteAssetClass(
  assetClass: unknown
): AssetClass {
  if (
    assetClass === "Equities" ||
    assetClass === "Options" ||
    assetClass === "Crypto" ||
    assetClass === "Forex"
  ) {
    return assetClass;
  }
  return "Equities";
}
